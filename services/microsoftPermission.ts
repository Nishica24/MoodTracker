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

    const pollConnectionStatus = async (maxAttempts = 10, delayMs = 1000): Promise<boolean> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const res = await fetch(`${base}/connection-status?device_id=${encodeURIComponent(deviceId)}`);
          const json = await res.json();
          if (json?.connected) {
            return true;
          }
        } catch {}
        await new Promise(r => setTimeout(r, delayMs));
      }
      return false;
    };

    if (await InAppBrowser.isAvailable()) {
      const result = await InAppBrowser.open(loginUrl, {
        dismissButtonStyle: 'cancel',
        showTitle: true,
        enableUrlBarHiding: true,
        enableDefaultShare: true,
      });

      // Regardless of the result type, verify with backend since the flow completes in the browser
      const connected = await pollConnectionStatus();
      return connected;
    } else {
      Linking.openURL(loginUrl);
      // Fallback: give user a moment, then check status once.
      const connected = await pollConnectionStatus();
      return connected;
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

export const fetchWorkStress = async (period: 'week' | 'month' | 'quarter' = 'week') => {
  const deviceId = await getOrCreateDeviceId();
  const base = 'http://localhost:5000';
  const url = `${base}/graph/work-stress?device_id=${encodeURIComponent(deviceId)}&period=${encodeURIComponent(period)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch work stress');
  return res.json() as Promise<{ labels: string[]; data: number[]; average: number; period: string }>;
};

export const fetchDashboardScores = async () => {
  const deviceId = await getOrCreateDeviceId();
  const base = 'http://localhost:5000';
  const url = `${base}/dashboard/scores?device_id=${encodeURIComponent(deviceId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dashboard scores');
  return res.json() as Promise<{
    work_stress: {
      score: number;
      level: string;
      trend: 'up' | 'down' | 'stable';
    };
    email_activity: {
      score: number;
      count: number;
      after_hours: number;
    };
    calendar_busyness: {
      score: number;
      meeting_hours: number;
      back_to_back_meetings: number;
      early_morning_meetings: number;
    };
    overall_productivity: {
      score: number;
      level: string;
    };
    period: string;
    last_updated: string;
  }>;
};