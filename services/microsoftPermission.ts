import { Platform, Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getOrCreateDeviceId(): Promise<string> {
  const key = 'device_id';
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  await AsyncStorage.setItem(key, uuid);
  return uuid;
}

export const handleMicrosoftLogin = async (): Promise<boolean> => {
  try {
    const deviceId = await getOrCreateDeviceId();
    // Use localhost with adb reverse for Android devices; works on iOS simulator too
    const base = 'http://localhost:5000';
    const loginUrl = `${base}/login?device_id=${encodeURIComponent(deviceId)}`;

    if (await InAppBrowser.isAvailable()) {
      const result = await InAppBrowser.open(loginUrl, {
        dismissButtonStyle: 'cancel',
        showTitle: true,
        enableUrlBarHiding: true,
        enableDefaultShare: true,
      });

      if (result.type === 'success') {
          console.log('Login successful');
        // Optionally call backend to confirm connection
        const statusRes = await fetch(`${base}/connection-status?device_id=${encodeURIComponent(deviceId)}`);
        const statusJson = await statusRes.json();
        return !!statusJson?.connected;
      } else {
        throw new Error("Login flow was cancelled or failed.");
      }
    } else {
      Linking.openURL(loginUrl);
      // Fallback: give user a moment, then check status once.
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await fetch(`${base}/connection-status?device_id=${encodeURIComponent(deviceId)}`);
      const statusJson = await statusRes.json();
      return !!statusJson?.connected;
    }
  } catch (error) {
    console.error("Microsoft Login Error:", error);
    return false; // Return false on any error
  }
};

export const fetchMicrosoftMe = async () => {
  const deviceId = await getOrCreateDeviceId();
  const base = 'http://localhost:5000';
  const res = await fetch(`${base}/graph/me?device_id=${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('Failed to fetch Microsoft profile');
  return res.json();
};

export const fetchMicrosoftEvents = async () => {
  const deviceId = await getOrCreateDeviceId();
  const base = 'http://localhost:5000';
  const res = await fetch(`${base}/graph/events?device_id=${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
};