import React, { useState, useEffect, useRef } from 'react';
import type { Reminder, CustomSound } from '../types';
import { TriggerType, IntervalUnit, LocationTrigger, Sound, TriggerTimeType } from '../types';
import { CloseIcon, UploadCloudIcon } from './Icons';
import { getAllSounds, addSound } from '../services/soundService';

interface ReminderFormProps {
  reminder: Reminder | null;
  onSave: (reminder: Reminder) => void;
  onClose: () => void;
}

const emptyReminder: Omit<Reminder, 'id' | 'createdAt'> = {
  text: '',
  triggerType: TriggerType.Time,
  triggerTimeType: TriggerTimeType.Interval,
  timeOfDay: '09:00',
  isRecurring: false,
  interval: 10,
  intervalUnit: IntervalUnit.Minutes,
  location: {
    address: '',
    lat: 0,
    lng: 0,
    radius: 100,
    triggerOn: LocationTrigger.OnEnter,
  },
  vibrate: false,
  sound: Sound.Default,
};

export const ReminderForm: React.FC<ReminderFormProps> = ({ reminder, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<Reminder, 'id' | 'createdAt'>>(() => 
    reminder 
        ? { ...emptyReminder, ...reminder } 
        : emptyReminder
  );
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If the reminder prop changes (e.g., from AI mic), update the form
    if (reminder) {
      setFormData({ ...emptyReminder, ...reminder });
    } else {
      setFormData(emptyReminder);
    }
  }, [reminder]);

  useEffect(() => {
    const fetchSounds = async () => {
        try {
            const sounds = await getAllSounds();
            setCustomSounds(sounds);
        } catch (error) {
            console.error("Failed to load custom sounds:", error);
        }
    };
    fetchSounds();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        const newFormData = { ...formData, [name]: checked };

        // If we are enabling recurring for an exact time, provide a default repeat interval
        if (name === 'isRecurring' && checked && newFormData.triggerTimeType === TriggerTimeType.Exact) {
            if (!newFormData.interval || !newFormData.intervalUnit) {
                newFormData.interval = 1;
                newFormData.intervalUnit = IntervalUnit.Days;
            }
        }
        setFormData(newFormData);
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
          ...prev,
          location: {
              ...prev.location!,
              [name]: value,
          }
      }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReminder: Reminder = {
      id: reminder?.id || Date.now().toString(), // Use existing id or generate temp one
      createdAt: reminder?.createdAt || Date.now(),
      ...formData,
      // Ensure numeric types
      interval: Number(formData.interval),
      location: formData.location ? { ...formData.location, radius: Number(formData.location.radius) } : undefined
    };
    onSave(finalReminder);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const newSound = await addSound(file);
        setCustomSounds(prev => [...prev, newSound]);
        setFormData(prev => ({ ...prev, sound: newSound.id }));
      } catch (error) {
        console.error("Error uploading sound:", error);
        alert(`Failed to upload sound: ${(error as Error).message}`);
      }
    }
  };
  
  const isTimeBased = formData.triggerType === TriggerType.Time;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <CloseIcon />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">{reminder ? 'Edit Reminder' : 'New Reminder'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div>
                <label htmlFor="text" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reminder</label>
                <textarea
                    id="text"
                    name="text"
                    value={formData.text}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trigger Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, triggerType: TriggerType.Time }))}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-blue-500 ${
                            formData.triggerType === TriggerType.Time
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Time
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, triggerType: TriggerType.Location }))}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-blue-500 ${
                            formData.triggerType === TriggerType.Location
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Location
                    </button>
                </div>
            </div>
            
            {isTimeBased ? (
                <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-md animate-fade-in">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-200 dark:bg-slate-700">
                         <button type="button" onClick={() => setFormData(prev => ({ ...prev, triggerTimeType: TriggerTimeType.Interval }))} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${formData.triggerTimeType === TriggerTimeType.Interval ? 'bg-white dark:bg-slate-800 shadow' : 'hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                            Interval
                         </button>
                         <button type="button" onClick={() => setFormData(prev => ({ ...prev, triggerTimeType: TriggerTimeType.Exact }))} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${formData.triggerTimeType === TriggerTimeType.Exact ? 'bg-white dark:bg-slate-800 shadow' : 'hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                            Exact Time
                         </button>
                    </div>

                    {formData.triggerTimeType === TriggerTimeType.Interval ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center">
                                <input id="isRecurringInterval" name="isRecurring" type="checkbox" checked={formData.isRecurring} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <label htmlFor="isRecurringInterval" className="ml-2 block text-sm text-slate-900 dark:text-slate-100">Is Recurring?</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="interval" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">{formData.isRecurring ? 'Every' : 'In'}</label>
                                <input id="interval" type="number" name="interval" value={formData.interval} onChange={handleChange} min="1" className="block w-24 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                                <select name="intervalUnit" value={formData.intervalUnit} onChange={handleChange} className="block flex-grow rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                    {Object.values(IntervalUnit).map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-2">
                                <label htmlFor="timeOfDay" className="text-sm font-medium text-slate-700 dark:text-slate-300">At time</label>
                                <input id="timeOfDay" type="time" name="timeOfDay" value={formData.timeOfDay} onChange={handleChange} className="block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                            </div>
                            <div className="flex items-center">
                                <input id="isRecurringExact" name="isRecurring" type="checkbox" checked={formData.isRecurring} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <label htmlFor="isRecurringExact" className="ml-2 block text-sm text-slate-900 dark:text-slate-100">Is Recurring?</label>
                            </div>
                            {formData.isRecurring && (
                                <div className="flex items-center gap-2 animate-fade-in">
                                    <label htmlFor="intervalRecurring" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">Repeat every</label>
                                    <input id="intervalRecurring" type="number" name="interval" value={formData.interval} onChange={handleChange} min="1" className="block w-24 rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                                    <select name="intervalUnit" value={formData.intervalUnit} onChange={handleChange} className="block flex-grow rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                        {Object.values(IntervalUnit).map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                 <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-md animate-fade-in">
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Location Name</label>
                        <input
                            type="text"
                            name="address"
                            id="address"
                            value={formData.location?.address}
                            onChange={handleLocationChange}
                            placeholder="e.g., Home, Office, Grocery Store"
                            className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                        <p className="text-xs text-slate-500 mt-1">Note: Geolocation (Lat/Lng) is not editable here. The app will use your device's current location to determine if you are at this named place.</p>
                    </div>
                    <div>
                        <label htmlFor="triggerOn" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trigger On</label>
                         <select
                            name="triggerOn"
                            id="triggerOn"
                            value={formData.location?.triggerOn}
                            onChange={handleLocationChange}
                            className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                         >
                            <option value={LocationTrigger.OnEnter}>Arrival (Entering)</option>
                            <option value={LocationTrigger.OnLeave}>Departure (Leaving)</option>
                         </select>
                    </div>
                 </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                     <label htmlFor="sound" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sound</label>
                     <div className="flex items-center gap-2">
                        <select
                            id="sound"
                            name="sound"
                            value={formData.sound}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                            <optgroup label="Default Sounds">
                                {Object.values(Sound).map(sound => <option key={sound} value={sound}>{sound.charAt(0).toUpperCase() + sound.slice(1)}</option>)}
                            </optgroup>
                            {customSounds.length > 0 && (
                                <optgroup label="Custom Sounds">
                                    {customSounds.map(sound => <option key={sound.id} value={sound.id}>{sound.name}</option>)}
                                </optgroup>
                            )}
                        </select>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
                        <button type="button" onClick={handleUploadClick} title="Upload custom sound" className="mt-1 p-2 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
                            <UploadCloudIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                 <div className="flex items-end pb-1">
                    <div className="flex items-center">
                        <input
                            id="vibrate"
                            name="vibrate"
                            type="checkbox"
                            checked={formData.vibrate}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="vibrate" className="ml-2 block text-sm text-slate-900 dark:text-slate-100">Vibrate</label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                    Cancel
                </button>
                <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700">
                    Save Reminder
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};