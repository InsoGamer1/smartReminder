import { useState, useEffect, useCallback } from 'react';
import type { Reminder } from '../types';
import { TriggerType } from '../types';
import { scheduleNotification, cancelNotification } from '../services/notificationService';
import { startWatchingLocation, stopWatchingLocation } from '../services/locationService';
import { showNotification } from '../services/notificationService';

const STORAGE_KEY = 'smart-reminders';

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const savedReminders = window.localStorage.getItem(STORAGE_KEY);
      return savedReminders ? JSON.parse(savedReminders) : [];
    } catch (error) {
      console.error('Error reading reminders from localStorage', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminders to localStorage', error);
    }

    // Update scheduled notifications and location watchers whenever reminders change
    const timeBasedReminders = reminders.filter(r => r.triggerType === TriggerType.Time);
    const locationBasedReminders = reminders.filter(r => r.triggerType === TriggerType.Location);

    // Schedule all time-based reminders
    timeBasedReminders.forEach(scheduleNotification);

    // Handle location-based reminders
    if (locationBasedReminders.length > 0) {
      startWatchingLocation(locationBasedReminders, (triggeredReminder) => {
        showNotification(triggeredReminder);
        // For non-recurring location reminders, remove them after they trigger
        if (!triggeredReminder.isRecurring) {
            deleteReminder(triggeredReminder.id);
        }
      });
    } else {
      stopWatchingLocation();
    }
    
    // Cleanup function to stop watching location when component unmounts
    return () => {
        stopWatchingLocation();
    };

  }, [reminders]);

  const addReminder = useCallback((reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setReminders(prev => [...prev, newReminder]);
  }, []);

  const updateReminder = useCallback((updatedReminder: Reminder) => {
    setReminders(prev => prev.map(r => r.id === updatedReminder.id ? updatedReminder : r));
  }, []);

  const deleteReminder = useCallback((id: string) => {
    // Also cancel any scheduled notification
    cancelNotification(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const importReminders = useCallback((newReminders: Reminder[]) => {
    // A simple merge, could be more sophisticated (e.g., check for duplicates)
    setReminders(prev => [...prev, ...newReminders]);
  }, []);

  return {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    importReminders
  };
};
