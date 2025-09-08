import { NativeModules, PermissionsAndroid, Platform, NativeEventEmitter } from 'react-native';

const { SleepModule } = NativeModules;

// Check if the native module is available
const isSleepModuleAvailable = () => {
  return SleepModule && typeof SleepModule.startTracking === 'function';
};

export interface SleepSegment {
  startTimeMillis: number;
  endTimeMillis: number;
  status: number;
}

const sleepEventEmitter = new NativeEventEmitter(SleepModule);

const requestPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || Platform.Version < 29) {
    return true;
  }
  try {
    // Request the standard permission first
    const standardPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      {
        title: 'Activity Recognition Permission',
        message: 'This app needs to access your activity data to automatically detect and score your sleep patterns.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      }
    );
    
    // For Google Play Services permission, we'll assume it's granted if standard permission is granted
    // since the GMS permission is typically granted automatically when the app has the standard permission
    const gmsPermission = standardPermission;
    
    const bothGranted = standardPermission === PermissionsAndroid.RESULTS.GRANTED && 
                       gmsPermission === PermissionsAndroid.RESULTS.GRANTED;
    
    console.log('Permission results:', { standardPermission, gmsPermission, bothGranted });
    return bothGranted;
  } catch (err) {
    console.warn('Error requesting sleep permission:', err);
    return false;
  }
};

const startTracking = async (): Promise<string> => {
  if (!isSleepModuleAvailable()) {
    throw new Error('Sleep tracking module is not available. This feature requires native Android implementation.');
  }
  
  const hasPermission = await requestPermission();
  if (!hasPermission) {
    throw new Error('Activity Recognition permission was denied.');
  }
  return SleepModule.startTracking();
};

const stopTracking = (): Promise<string> => {
  if (!isSleepModuleAvailable()) {
    throw new Error('Sleep tracking module is not available.');
  }
  return SleepModule.stopTracking();
};

const addSleepListener = (callback: (event: SleepSegment[]) => void) => {
  if (!isSleepModuleAvailable()) {
    console.warn('Sleep tracking module is not available. Sleep listener will not work.');
    return {
      remove: () => {}
    };
  }
  
  return sleepEventEmitter.addListener('SleepUpdate', (eventJson: string) => {
    try {
      const events: SleepSegment[] = JSON.parse(eventJson);
      callback(events);
    } catch (e) {
      console.error('Failed to parse incoming sleep event data:', e);
    }
  });
};

export const SleepService = {
  requestPermission,
  startTracking,
  stopTracking,
  addSleepListener,
  isAvailable: isSleepModuleAvailable,
};