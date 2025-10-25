import { GoogleGenAI, Type } from "@google/genai";
import { IntervalUnit, Sound, TriggerType, LocationTrigger } from '../types';
import type { Reminder } from '../types';

const reminderSchema = {
    type: Type.OBJECT,
    properties: {
        text: {
            type: Type.STRING,
            description: "The core text of the reminder (e.g., 'Buy milk', 'Call mom').",
        },
        triggerType: {
            type: Type.STRING,
            enum: [TriggerType.Time, TriggerType.Location],
            description: "The type of trigger for the reminder. Use 'time' for time-based reminders and 'location' for location-based ones."
        },
        isRecurring: {
            type: Type.BOOLEAN,
            description: "For time-based reminders, is it recurring? (e.g., 'every day', 'every 10 minutes'). Defaults to false for single events.",
        },
        interval: {
            type: Type.NUMBER,
            description: "For time-based reminders, the numeric value of the interval (e.g., for 'every 10 minutes', this is 10). For non-recurring reminders set in the future (e.g., 'in 5 hours'), this is the delay from now.",
        },
        intervalUnit: {
            type: Type.STRING,
            enum: [IntervalUnit.Minutes, IntervalUnit.Hours, IntervalUnit.Days],
            description: "For time-based reminders, the unit of the interval. Defaults to 'minutes'.",
        },
        location: {
            type: Type.OBJECT,
            description: "For location-based reminders, contains the location details. This should be null for time-based reminders.",
            properties: {
                address: {
                    type: Type.STRING,
                    description: "A user-friendly name for the location (e.g., 'home', 'the office', 'the grocery store').",
                },
                triggerOn: {
                    type: Type.STRING,
                    enum: [LocationTrigger.OnEnter, LocationTrigger.OnLeave],
                    description: "Whether the reminder should trigger on arriving at ('enter') or leaving ('leave') the location. Defaults to 'enter'."
                }
            }
        },
        vibrate: {
            type: Type.BOOLEAN,
            description: "Should the device vibrate? Defaults to false.",
        },
        sound: {
            type: Type.STRING,
            enum: [Sound.Default, Sound.Chime, Sound.Beep, Sound.None],
            description: "The notification sound. Defaults to 'default'."
        }
    },
    required: ["text", "triggerType"]
};


export const parseReminderFromText = async (text: string, apiKey: string): Promise<Partial<Reminder>> => {
    if (!apiKey) {
        throw new Error("Gemini API Key is not configured. Please set it in the settings.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
        Parse the following user request to create a reminder. The current time is ${new Date().toLocaleString()}.
        Extract the details and return them as a JSON object matching the provided schema.
        
        - If the user mentions a specific time delay like "in 10 minutes" or "in 2 hours", set "isRecurring" to false, and set "interval" and "intervalUnit" to reflect that delay.
        - If the user mentions a recurring event like "every 5 minutes" or "every day", set "isRecurring" to true, and set "interval" and "intervalUnit".
        - If no time is mentioned, create a simple, non-recurring reminder due in 1 minute.
        - For location reminders, identify the place and whether the trigger is on arrival or departure. If not specified, default to arrival.
        - If the user just says "remind me to...", the 'text' is what follows.
        - Location details like lat/lng/radius will be filled in by the user later, so just extract the address name and trigger condition.
        - Do not invent any information not present in the text.
        - If the request is ambiguous or doesn't seem like a reminder, return an object with an 'error' property.

        User request: "${text}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro", // Using a more capable model for JSON parsing
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: reminderSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);
        
        // Basic validation
        if (!parsedData.text || !parsedData.triggerType) {
            throw new Error("Could not extract necessary reminder details.");
        }
        
        // Provide default values for optional fields if not returned by AI
        const result: Partial<Reminder> = {
            text: parsedData.text,
            triggerType: parsedData.triggerType,
            vibrate: parsedData.vibrate ?? false,
            sound: parsedData.sound ?? Sound.Default,
        };

        if (result.triggerType === TriggerType.Time) {
            result.isRecurring = parsedData.isRecurring ?? false;
            result.interval = parsedData.interval ?? 1;
            result.intervalUnit = parsedData.intervalUnit ?? IntervalUnit.Minutes;
        } else if (result.triggerType === TriggerType.Location && parsedData.location) {
             result.location = {
                address: parsedData.location.address || 'Unknown Location',
                triggerOn: parsedData.location.triggerOn || LocationTrigger.OnEnter,
                lat: 0, // Placeholder
                lng: 0, // Placeholder
                radius: 100, // Default
            };
        } else if (result.triggerType === TriggerType.Location && !parsedData.location) {
            // Handle case where AI identifies location trigger but not details
            throw new Error("Please specify a location for the reminder.");
        }

        return result;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Sorry, I couldn't understand that. Please try again with a clearer instruction.");
    }
};