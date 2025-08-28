import { Linking, Platform, PermissionsAndroid } from 'react-native';

/**
 * Checks and requests permission to read call logs on Android.
 * @returns {Promise<boolean>} - True if permission is granted, false otherwise.
 */

 /// Function to check and ask for call logs permission
export const handleCallLogPermission = async (): Promise<boolean> => {

  // This feature is only applicable to Android
  if (Platform.OS !== 'android') {
    return false;
  }

  try {

    // Check if permission is already granted
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );

    if (hasPermission) {
      return true;
    }

    // If not granted, request it from the user
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: 'Call Log Permission',
        message: 'MoodTracker needs access to your call logs to analyze social activity patterns.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    console.log('Call log permission granted:', granted)

    // Return true only if the user explicitly granted the permission
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Error requesting call log permission:', err);
    return false;
  }
};


// Function to open the permissions settings when the user wants to revoke any permissions
export const openAppSettings = () => {

    console.log("Inside settings function")
    Linking.openSettings();
}


// You can add other permission-handling functions here in the future!