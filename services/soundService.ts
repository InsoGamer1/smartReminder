import type { CustomSound } from '../types';

const DB_NAME = 'smart-reminders-db';
const DB_VERSION = 1;
const STORE_NAME = 'customSounds';

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject('Error opening IndexedDB.');
    };
  });
};

export const addSound = async (file: File): Promise<CustomSound> => {
  const db = await initDB();
  const id = `${Date.now()}-${file.name}`;
  const sound = { id, name: file.name, data: file };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(sound);

    request.onsuccess = () => {
      resolve({ id, name: file.name });
    };

    request.onerror = (event) => {
      console.error('Error adding sound:', (event.target as IDBRequest).error);
      reject('Could not add sound to database.');
    };
  });
};

export const getSound = async (id: string): Promise<{ id: string; name: string; data: Blob } | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('Error getting sound:', (event.target as IDBRequest).error);
      reject('Could not retrieve sound from database.');
    };
  });
};

export const getAllSounds = async (): Promise<CustomSound[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
      const allSounds = (event.target as IDBRequest).result as { id: string; name: string; data: Blob }[];
      // Return only metadata, not the large blob data
      resolve(allSounds.map(({ id, name }) => ({ id, name })));
    };

    request.onerror = (event) => {
      console.error('Error getting all sounds:', (event.target as IDBRequest).error);
      reject('Could not retrieve sounds from database.');
    };
  });
};

let audioContext: AudioContext;
const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

const playTone = (type: 'chime' | 'beep') => {
    const context = getAudioContext();
    if (context.state === 'suspended') {
        context.resume();
    }
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    if (type === 'chime') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.1); // E5
        gainNode.gain.setValueAtTime(0.5, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
    } else { // beep
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, context.currentTime); // A5
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.2);
    }
};

export const playSound = async (soundId: string) => {
    if (soundId === 'none' || soundId === 'default') {
        return; 
    }

    if (soundId === 'chime' || soundId === 'beep') {
        playTone(soundId);
        return;
    }

    try {
        const sound = await getSound(soundId);
        if (sound && sound.data) {
            const context = getAudioContext();
            if (context.state === 'suspended') {
                await context.resume();
            }
            const arrayBuffer = await sound.data.arrayBuffer();
            const audioBuffer = await context.decodeAudioData(arrayBuffer);
            
            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.start(0);
        }
    } catch (error) {
        console.error(`Error playing custom sound ${soundId}:`, error);
    }
};
