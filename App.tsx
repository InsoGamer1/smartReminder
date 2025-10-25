
import React, { useState, useEffect } from 'react';
import { useReminders } from './hooks/useReminders';
import { useSettings } from './hooks/useSettings';
// FIX: Import Sound enum to use for default values.
import { type Reminder, Sound } from './types';
import { ReminderCard } from './components/ReminderCard';
import { ReminderForm } from './components/ReminderForm';
import { AiMic } from './components/AiMic';
import { SettingsPage } from './components/SettingsPage';
import { PlusIcon, SettingsIcon } from './components/Icons';

function App() {
  const { reminders, addReminder, updateReminder, deleteReminder, importReminders } = useReminders();
  const { settings } = useSettings(); // Settings are applied globally by the hook
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Request notification permission on app load
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingReminder(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingReminder(null);
  };

  const handleSave = (reminder: Reminder) => {
    if (reminders.some(r => r.id === reminder.id)) {
      updateReminder(reminder);
    } else {
      // The `addReminder` hook handles adding id and createdAt
      const { id, createdAt, ...newReminder } = reminder;
      addReminder(newReminder);
    }
    handleCloseForm();
  };

  const handleAiReminder = (parsedReminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    // Open the form with the AI-parsed data for user confirmation/editing
    const tempReminder: Reminder = {
      id: '', // Temporary
      createdAt: 0, // Temporary
      ...parsedReminder,
      // Provide defaults for any fields the AI might have missed
      vibrate: parsedReminder.vibrate ?? false,
      // FIX: Use Sound.Default enum member instead of string literal 'default'.
      sound: parsedReminder.sound ?? Sound.Default,
    };
    setEditingReminder(tempReminder);
    setIsFormOpen(true);
  };


  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans">
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Smart Reminders</h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400"
            aria-label="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        {reminders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {reminders.sort((a,b) => b.createdAt - a.createdAt).map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onEdit={handleEdit}
                onDelete={deleteReminder}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">No reminders yet!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Click the '+' button or use the mic to add one.</p>
          </div>
        )}
      </main>
      
      {isFormOpen && (
        <ReminderForm
          reminder={editingReminder}
          onSave={handleSave}
          onClose={handleCloseForm}
        />
      )}

      {isSettingsOpen && (
          <SettingsPage 
            onClose={() => setIsSettingsOpen(false)}
            reminders={reminders}
            onImport={importReminders}
          />
      )}

      <div className="fixed bottom-8 left-8 z-50">
        <button
          onClick={handleAddNew}
          className="w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full text-white shadow-lg flex items-center justify-center transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Add new reminder"
        >
          <PlusIcon />
        </button>
      </div>

      <AiMic onReminderParsed={handleAiReminder} />
    </div>
  );
}

export default App;