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
    const base = 'https://moodtracker-9ygs.onrender.com';
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
  const base = 'https://moodtracker-9ygs.onrender.com';
  const res = await fetch(`${base}/graph/me?device_id=${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('Failed to fetch Microsoft profile');
  return res.json();
};

export const fetchMicrosoftEvents = async () => {
  const deviceId = await getOrCreateDeviceId();
  const base = 'https://moodtracker-9ygs.onrender.com';
  const res = await fetch(`${base}/graph/events?device_id=${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
};

export const fetchWorkStress = async (period: 'week' | 'month' | 'quarter' = 'week') => {
  const deviceId = await getOrCreateDeviceId();
  const base = 'https://moodtracker-9ygs.onrender.com';
  const url = `${base}/graph/work-stress?device_id=${encodeURIComponent(deviceId)}&period=${encodeURIComponent(period)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch work stress');
  return res.json() as Promise<{ labels: string[]; data: number[]; average: number; period: string }>;
};

export const checkMicrosoftConnection = async (): Promise<boolean> => {
  try {
    const deviceId = await getOrCreateDeviceId();
    const base = 'https://moodtracker-9ygs.onrender.com';
    const url = `${base}/connection-status?device_id=${encodeURIComponent(deviceId)}`;
    
    console.log(`🔍 DEBUG: Checking Microsoft connection at: ${url}`);
    
    const res = await fetch(url);
    
    // Check if response is ok
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ DEBUG: Microsoft connection check failed with status ${res.status}: ${errorText}`);
      return false;
    }
    
    // Check content type before parsing JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await res.text();
      console.error(`❌ DEBUG: Expected JSON but got content-type: ${contentType}`);
      console.error(`❌ DEBUG: Response body: ${responseText.substring(0, 200)}...`);
      return false;
    }
    
    const json = await res.json();
    
    console.log(`🔍 DEBUG: Microsoft connection check result:`, json);
    
    const isConnected = json?.connected || false;
    
    // Don't automatically sync local storage - let user manually disconnect
    // This prevents the connections tab from showing disconnected when app reopens
    
    return isConnected;
  } catch (error) {
    console.error('Failed to check Microsoft connection:', error);
    // On error, don't change local storage - just return false
    return false;
  }
};

// Shared Microsoft connection state management
export const setMicrosoftConnectionStatus = async (connected: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem('microsoft_connected', connected.toString());
  } catch (error) {
    console.error('Failed to save Microsoft connection status:', error);
  }
};

export const getMicrosoftConnectionStatus = async (): Promise<boolean> => {
  try {
    const status = await AsyncStorage.getItem('microsoft_connected');
    return status === 'true';
  } catch (error) {
    console.error('Failed to get Microsoft connection status:', error);
    return false;
  }
};

// Microsoft modal shown status management
export const setMicrosoftModalShown = async (shown: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem('microsoft_modal_shown', shown.toString());
  } catch (error) {
    console.error('Failed to save Microsoft modal shown status:', error);
  }
};

export const getMicrosoftModalShown = async (): Promise<boolean> => {
  try {
    const shown = await AsyncStorage.getItem('microsoft_modal_shown');
    return shown === 'true';
  } catch (error) {
    console.error('Failed to get Microsoft modal shown status:', error);
    return false;
  }
};

export const fetchDashboardScores = async () => {
  try {
    const deviceId = await getOrCreateDeviceId();
    const base = 'https://moodtracker-9ygs.onrender.com';
    const url = `${base}/dashboard/scores?device_id=${encodeURIComponent(deviceId)}`;
    
    console.log(`🔍 DEBUG: Fetching dashboard scores from: ${url}`);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ DEBUG: Dashboard scores fetch failed: ${res.status} - ${errorText}`);
      
      // Don't automatically disconnect on 401 - let user manually disconnect
      // This prevents the connections tab from showing disconnected when app reopens
      
      throw new Error(`Failed to fetch dashboard scores: ${res.status} - ${errorText}`);
    }
    
    // Check content type before parsing JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await res.text();
      console.error(`❌ DEBUG: Expected JSON but got content-type: ${contentType}`);
      console.error(`❌ DEBUG: Response body: ${responseText.substring(0, 200)}...`);
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    
    const data = await res.json();
    console.log(`✅ DEBUG: Dashboard scores fetched successfully:`, data);
    
    return data as Promise<{
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
  } catch (error) {
    console.error(`❌ DEBUG: Error in fetchDashboardScores:`, error);
    throw error;
  }
};