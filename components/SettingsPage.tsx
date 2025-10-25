import React, { useState, useRef } from 'react';
import type { Reminder } from '../types';
import { useSettings, Theme } from '../hooks/useSettings';
import { downloadJson, readJsonFile } from '../services/fileService';
import { CloseIcon, ImportIcon, ExportIcon } from './Icons';

interface SettingsPageProps {
  onClose: () => void;
  reminders: Reminder[];
  onImport: (reminders: Reminder[]) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose, reminders, onImport }) => {
  const { settings, saveSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');


  const handleExport = () => {
    downloadJson(reminders, `smart-reminders-backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const importedReminders = await readJsonFile<Reminder[]>(file);
        // Basic validation
        if (Array.isArray(importedReminders) && importedReminders.every(r => r.id && r.text)) {
           onImport(importedReminders);
           alert(`${importedReminders.length} reminders imported successfully!`);
           onClose();
        } else {
           throw new Error("Invalid file format.");
        }
      } catch (error) {
        alert(`Error importing file: ${(error as Error).message}`);
      }
    }
  };
  
  const handleSaveApiKey = () => {
    saveSettings({ apiKey });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const renderThemeButton = (theme: Theme, label: string) => (
      <button
        onClick={() => saveSettings({ theme })}
        className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${
          settings.theme === theme
            ? 'bg-blue-600 text-white shadow'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
      >
        {label}
      </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <CloseIcon />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">Settings</h2>

        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Theme</h3>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                    {renderThemeButton('light', 'Light')}
                    {renderThemeButton('dark', 'Dark')}
                    {renderThemeButton('system', 'System')}
                </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                 <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">API Configuration</h3>
                 <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Gemini API Key
                    </label>
                    <div className="mt-1 flex gap-2">
                        <input
                            type="password"
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="flex-grow block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            placeholder="Enter your API key"
                        />
                        <button
                            onClick={handleSaveApiKey}
                            className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white transition-colors ${saveStatus === 'saved' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {saveStatus === 'saved' ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                 </div>
            </div>
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Data Management</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                     <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <ImportIcon className="w-4 h-4" />
                        Import Reminders
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="application/json"
                        className="hidden"
                    />
                     <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <ExportIcon className="w-4 h-4" />
                        Export Reminders
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};