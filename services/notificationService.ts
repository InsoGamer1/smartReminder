import type { Reminder } from '../types';
import { TriggerType, IntervalUnit, TriggerTimeType } from '../types';
import { playSound } from './soundService';

const scheduledNotifications = new Map<string, number>();

const getIntervalMilliseconds = (interval: number, unit: IntervalUnit): number => {
    switch (unit) {
        case IntervalUnit.Minutes:
            return interval * 60 * 1000;
        case IntervalUnit.Hours:
            return interval * 60 * 60 * 1000;
        case IntervalUnit.Days:
            return interval * 24 * 60 * 60 * 1000;
        default:
            return 0;
    }
};

export const showNotification = (reminder: Reminder) => {
    playSound(reminder.sound);
    
    if ('Notification' in window && Notification.permission === 'granted') {
        const options: NotificationOptions & { vibrate?: number[] } = {
            body: `Triggered at ${new Date().toLocaleTimeString()}`,
            vibrate: reminder.vibrate ? [200, 100, 200] : undefined,
        };
        new Notification(reminder.text, options);
    } else {
        alert(`Reminder: ${reminder.text}`);
    }
};

export const scheduleNotification = (reminder: Reminder) => {
    cancelNotification(reminder.id);

    if (reminder.triggerType !== TriggerType.Time) return;

    let delay = 0;

    if (reminder.triggerTimeType === TriggerTimeType.Exact && reminder.timeOfDay) {
        const now = new Date();
        const [hours, minutes] = reminder.timeOfDay.split(':').map(Number);
        
        const targetDate = new Date();
        targetDate.setHours(hours, minutes, 0, 0);

        if (targetDate.getTime() <= now.getTime()) {
            if (reminder.isRecurring) {
                const intervalMs = getIntervalMilliseconds(reminder.interval || 1, reminder.intervalUnit || IntervalUnit.Days);
                 if (intervalMs > 0) {
                     while (targetDate.getTime() <= now.getTime()) {
                        targetDate.setTime(targetDate.getTime() + intervalMs);
                     }
                 } else {
                     targetDate.setDate(targetDate.getDate() + 1); // Fallback to next day
                 }
            } else {
                targetDate.setDate(targetDate.getDate() + 1);
            }
        }
        delay = targetDate.getTime() - now.getTime();

    } else if (reminder.triggerTimeType === TriggerTimeType.Interval) {
        if (!reminder.interval || !reminder.intervalUnit) return;
        delay = getIntervalMilliseconds(reminder.interval, reminder.intervalUnit);
    }

    if (delay <= 0) return;

    const timeoutId = window.setTimeout(() => {
        showNotification(reminder);
        
        if (reminder.isRecurring) {
            // Re-schedule for the next occurrence from now
            scheduleNotification(reminder);
        } else {
            // Clean up for non-recurring
            scheduledNotifications.delete(reminder.id);
            // In a more complex app, we might also want to update the reminder's state to "completed"
        }
    }, delay);

    scheduledNotifications.set(reminder.id, timeoutId);
};

export const cancelNotification = (id: string) => {
    if (scheduledNotifications.has(id)) {
        const timerId = scheduledNotifications.get(id)!;
        window.clearTimeout(timerId);
        scheduledNotifications.delete(id);
    }
};
