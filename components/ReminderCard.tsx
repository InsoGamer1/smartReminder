import React from 'react';
import type { Reminder } from '../types';
import { TriggerType, IntervalUnit, LocationTrigger, TriggerTimeType } from '../types';
import { BellIcon, RepeatIcon, SoundIcon, VibrateIcon, LocationIcon, EditIcon, DeleteIcon } from './Icons';

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

const formatTime = (createdAt: number) => {
    return new Date(createdAt).toLocaleString();
};

const formatTrigger = (reminder: Reminder): string => {
    if (reminder.triggerType === TriggerType.Time) {
        if (reminder.triggerTimeType === TriggerTimeType.Exact) {
            const [hours, minutes] = (reminder.timeOfDay || "00:00").split(':');
            const d = new Date();
            d.setHours(parseInt(hours), parseInt(minutes));
            const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (reminder.isRecurring) {
                const unit = (reminder.intervalUnit || 'days').replace(/s$/, '');
                const interval = reminder.interval || 1;
                const plural = interval > 1 ? 's' : '';
                return `Repeats every ${interval} ${unit}${plural} at ${timeString}`;
            }
            return `One-time alert for ${timeString}`;
        }
        // Fallback for Interval type
        if (reminder.isRecurring) {
            return `Repeats every ${reminder.interval} ${reminder.intervalUnit || IntervalUnit.Minutes}`;
        }
        return `One-time alert`;
    }
    if (reminder.triggerType === TriggerType.Location && reminder.location) {
        return `Triggers on ${reminder.location.triggerOn === LocationTrigger.OnEnter ? 'arrival at' : 'departure from'} ${reminder.location.address}`;
    }
    return 'No trigger set';
};

export const ReminderCard: React.FC<ReminderCardProps> = ({ reminder, onEdit, onDelete }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{reminder.text}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{formatTrigger(reminder)}</p>
        
        <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300 mb-4">
            {reminder.triggerType === TriggerType.Time && (
                <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                    <BellIcon className="w-4 h-4" />
                    Time-based
                </span>
            )}
            {reminder.triggerType === TriggerType.Location && (
                <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                    <LocationIcon className="w-4 h-4" />
                    Location-based
                </span>
            )}
             {reminder.isRecurring && (
                <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full">
                    <RepeatIcon className="w-4 h-4" />
                    Recurring
                </span>
            )}
             {reminder.sound !== 'none' && (
                <span className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded-full">
                    <SoundIcon className="w-4 h-4" />
                    Sound: {reminder.sound}
                </span>
            )}
            {reminder.vibrate && (
                <span className="flex items-center gap-1 bg-pink-100 dark:bg-pink-900 px-2 py-1 rounded-full">
                    <VibrateIcon className="w-4 h-4" />
                    Vibrate
                </span>
            )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">Created: {formatTime(reminder.createdAt)}</p>
      </div>

      <div className="flex justify-end items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onEdit(reminder)}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 mr-2"
          aria-label="Edit reminder"
        >
          <EditIcon />
        </button>
        <button
          onClick={() => onDelete(reminder.id)}
          className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
          aria-label="Delete reminder"
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
};
