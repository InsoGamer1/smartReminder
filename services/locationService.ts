import type { Reminder } from '../types';
import { LocationTrigger } from '../types';

let watchId: number | null = null;
const locationStates = new Map<string, { wasInside: boolean }>();

// Haversine formula to calculate distance between two lat/lng points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const checkReminders = (position: GeolocationPosition, reminders: Reminder[], onTrigger: (reminder: Reminder) => void) => {
  const { latitude, longitude } = position.coords;

  for (const reminder of reminders) {
    if (!reminder.location) continue;

    const distance = calculateDistance(latitude, longitude, reminder.location.lat, reminder.location.lng);
    const isInside = distance <= reminder.location.radius;
    
    const state = locationStates.get(reminder.id) || { wasInside: isInside };

    if (state.wasInside !== isInside) {
      if (isInside && reminder.location.triggerOn === LocationTrigger.OnEnter) {
        onTrigger(reminder);
      } else if (!isInside && reminder.location.triggerOn === LocationTrigger.OnLeave) {
        onTrigger(reminder);
      }
    }
    
    locationStates.set(reminder.id, { wasInside: isInside });
  }
};

export const startWatchingLocation = (
  reminders: Reminder[],
  onTrigger: (reminder: Reminder) => void
) => {
  if (watchId !== null) {
    stopWatchingLocation();
  }

  // Initialize states for all current location reminders
  locationStates.clear();
  navigator.geolocation.getCurrentPosition(position => {
    reminders.forEach(reminder => {
       if (!reminder.location) return;
       const distance = calculateDistance(position.coords.latitude, position.coords.longitude, reminder.location.lat, reminder.location.lng);
       locationStates.set(reminder.id, { wasInside: distance <= reminder.location.radius });
    });
  });

  const handleError = (error: GeolocationPositionError) => {
    console.error("Error watching location:", error.message);
    // Stop watching to prevent repeated errors, especially on permission denial.
    stopWatchingLocation();
    if (error.code === error.PERMISSION_DENIED) {
      alert("Location permission was denied. Location-based reminders will not work. To use this feature, please enable location access for this site in your browser settings.");
    } else {
      alert("Could not get your location. Location-based reminders may not function correctly.");
    }
  };

  watchId = navigator.geolocation.watchPosition(
    (position) => checkReminders(position, reminders, onTrigger),
    handleError,
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

export const stopWatchingLocation = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
};