export enum TriggerType {
  Time = 'time',
  Location = 'location',
}

export enum LocationTrigger {
  OnEnter = 'enter',
  OnLeave = 'leave',
}

export enum IntervalUnit {
  Minutes = 'minutes',
  Hours = 'hours',
  Days = 'days',
}

export enum Sound {
  Default = 'default',
  Chime = 'chime',
  Beep = 'beep',
  None = 'none',
}

export enum TriggerTimeType {
  Interval = 'interval',
  Exact = 'exact',
}

export interface Reminder {
  id: string;
  createdAt: number;
  text: string;
  triggerType: TriggerType;
  
  // Time-based specific fields
  triggerTimeType?: TriggerTimeType;
  timeOfDay?: string; // e.g., "14:30"
  isRecurring?: boolean;
  interval?: number;
  intervalUnit?: IntervalUnit;
  
  // Location-based specific fields
  location?: {
    address: string;
    lat: number;
    lng: number;
    radius: number; // in meters
    triggerOn: LocationTrigger;
  };
  vibrate: boolean;
  sound: string; // Can be a Sound enum value or a custom sound ID
}

export interface CustomSound {
  id: string;
  name: string;
}
