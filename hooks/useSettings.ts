
import { useState, useEffect, useCallback } from 'react';

const SETTINGS_KEY = 'smart-reminders-settings';

export type Theme = 'light' | 'dark' | 'system';

interface Settings {
  theme: Theme;
  apiKey: string;
}

const defaultSettings: Settings = {
  theme: 'system',
  apiKey: '',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const savedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        return { ...defaultSettings, ...JSON.parse(savedSettings) };
      }
      return defaultSettings;
    } catch (error) {
      console.error('Error reading settings from localStorage', error);
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // FIX: Corrected the syntax of the try...catch block.
    } catch (error) {
      console.error('Error saving settings to localStorage', error);
    }

    // Apply theme
    const applyTheme = (theme: Theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    };
    
    applyTheme(settings.theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme(settings.theme);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);

  }, [settings]);

  const saveSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return { settings, saveSettings };
};