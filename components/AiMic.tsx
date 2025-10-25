import React, { useState, useEffect, useRef } from 'react';
import { MicIcon } from './Icons';
import { parseReminderFromText } from '../services/aiService';
import type { Reminder } from '../types';
import { useSettings } from '../hooks/useSettings';

// FIX: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These interfaces are not part of the standard TS DOM library.
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

// Define the constructor type
interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

// Augment the window object
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

interface AiMicProps {
  onReminderParsed: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void;
}

// Check for SpeechRecognition API
// FIX: Use a different variable name to avoid conflict with the SpeechRecognition interface type.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognitionAPI;

export const AiMic: React.FC<AiMicProps> = ({ onReminderParsed }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  const { settings } = useSettings();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!isSpeechRecognitionSupported) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
        handleSpeechEnd(finalTranscript);
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleSpeechEnd = async (text: string) => {
    if (!text.trim()) {
        setError('No speech detected.');
        return;
    }
     if (!settings.apiKey) {
      setError('Please set your Gemini API Key in the settings before using the AI mic.');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      const parsedReminder = await parseReminderFromText(text, settings.apiKey);
      // Validate the AI's response before proceeding
      if (!parsedReminder || !parsedReminder.text || !parsedReminder.triggerType) {
          throw new Error("AI failed to create a valid reminder. Please be more specific.");
      }
      onReminderParsed(parsedReminder as Omit<Reminder, 'id' | 'createdAt'>);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!settings.apiKey) {
        setError('Please set your Gemini API Key in the settings first.');
        return;
      }
      setTranscript('');
      setError('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const getButtonClass = () => {
      if (isProcessing) return 'bg-yellow-500 animate-pulse';
      if (isListening) return 'bg-red-600 animate-pulse';
      return 'bg-blue-600 hover:bg-blue-700';
  }

  if (!isSpeechRecognitionSupported) {
    return null; // Don't render if not supported
  }

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={toggleListen}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full text-white shadow-lg flex items-center justify-center transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-75 disabled:cursor-not-allowed ${getButtonClass()}`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening || isProcessing ? <div className="w-4 h-4 bg-white rounded-sm animate-pulse"></div> : <MicIcon />}
        </button>
      </div>

      {(isListening || isProcessing || error) && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-40 p-4 text-center">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl max-w-lg w-full">
                {isProcessing ? (
                    <>
                        <p className="text-xl font-semibold text-slate-800 dark:text-slate-200">Processing your reminder...</p>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">"{transcript}"</p>
                    </>
                ) : isListening ? (
                    <p className="text-xl font-semibold text-slate-800 dark:text-slate-200">Listening...</p>
                ) : error ? (
                    <>
                        <p className="text-xl font-semibold text-red-500">Oops!</p>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">{error}</p>
                        <button onClick={() => setError('')} className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">Try Again</button>
                    </>
                ) : null}
            </div>
        </div>
      )}
    </>
  );
};