import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://moodtracker-9ygs.onrender.com/api';

export interface UserData {
  id: string;
  name: string;
  email: string;
  age?: number;
  role?: string;
  created_at: string;
}

export interface UserScore {
  _id: string;
  userId: string;
  date: string;
  overallScore: number;
  breakdown: {
    moodLevel: number;
    socialScore: number;
    workStressScore: number;
    screenTimePenalty: number;
    interactionPenalty: number | null;
  };
  updatedAt: string;
}

export interface UserStats {
  days_tracked: number;
  avg_mood: number;
  connected_apps: number;
}

class UserService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const userData = await AsyncStorage.getItem('auth_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  async getUserData(): Promise<UserData | null> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getCurrentUserId();

      console.log('🔍 DEBUG: UserService - Token exists:', !!token);
      console.log('🔍 DEBUG: UserService - User ID:', userId);

      if (!token || !userId) {
        console.error('No auth token or user ID found');
        return null;
      }

      console.log('🔍 DEBUG: UserService - Making API call to:', `${API_BASE_URL}/user-profile/${userId}`);

      const response = await fetch(`${API_BASE_URL}/user-profile/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 DEBUG: UserService - Response status:', response.status);
      console.log('🔍 DEBUG: UserService - Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch user data:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('🔍 DEBUG: UserService - Response data:', data);
      
      return {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        age: data.user.age,
        role: data.user.role,
        created_at: data.user.created_at
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  // Fallback method to get basic user info from local storage
  async getFallbackUserData(): Promise<UserData | null> {
    try {
      const userData = await AsyncStorage.getItem('auth_user');
      if (userData) {
        const user = JSON.parse(userData);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting fallback user data:', error);
      return null;
    }
  }

  // User Stats Methods
  async getUserStats(): Promise<UserStats | null> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getCurrentUserId();

      console.log('🔍 DEBUG: UserService - Token exists:', !!token);
      console.log('🔍 DEBUG: UserService - User ID:', userId);

      if (!token || !userId) {
        console.error('No auth token or user ID found');
        return null;
      }

      // Fetch user scores from the existing endpoint
      console.log('🔍 DEBUG: UserService - Making API call to:', `${API_BASE_URL}/user-scores/${userId}`);

      const response = await fetch(`${API_BASE_URL}/user-scores/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 DEBUG: UserService - Response status:', response.status);
      console.log('🔍 DEBUG: UserService - Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch user stats:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('🔍 DEBUG: UserService - Response data:', data);

      // Calculate stats from user_scores data
      const scores = data.scores || [];
      const daysTracked = scores.length;
      
      console.log('🔍 DEBUG: Raw scores data:', scores);
      console.log('🔍 DEBUG: Number of scores:', daysTracked);
      
      // Calculate average mood from overallScore field
      let avgMood = 0;
      if (scores.length > 0) {
        console.log('🔍 DEBUG: Individual overallScore values:');
        scores.forEach((score: any, index: number) => {
          console.log(`🔍 DEBUG: Score ${index + 1}: overallScore = ${score.overallScore}`);
        });
        
        const totalOverallScore = scores.reduce((sum: number, score: any) => {
          // Use the overallScore field directly from the database
          const overallScore = score.overallScore || 0;
          console.log(`🔍 DEBUG: Adding ${overallScore} to sum (current sum: ${sum})`);
          return sum + overallScore;
        }, 0);
        
        console.log('🔍 DEBUG: Total overallScore:', totalOverallScore);
        console.log('🔍 DEBUG: Number of scores:', scores.length);
        
        avgMood = Math.round((totalOverallScore / scores.length) * 10) / 10; // Round to 1 decimal
        
        console.log('🔍 DEBUG: Calculated average mood:', avgMood);
      }

      // Get connected apps count
      const connectedApps = await this.getConnectedAppsCount();

      return {
        days_tracked: daysTracked,
        avg_mood: avgMood,
        connected_apps: connectedApps
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }

  async getConnectedAppsCount(): Promise<number> {
    try {
      // Check Microsoft connection status
      const { checkMicrosoftConnection } = await import('./microsoftPermission');
      const microsoftConnected = await checkMicrosoftConnection();
      
      // Check other permissions (Android only)
      let connectedCount = 0;
      
      // Microsoft Outlook
      if (microsoftConnected) connectedCount++;
      
      // Google Fit is always connected (hardcoded in connections tab)
      connectedCount++;
      
      // For Android, check other permissions
      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const { ScreenTimeService } = await import('./ScreenTimeService');
        
        // Check call log permission
        const hasCallLogPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
        );
        if (hasCallLogPermission) connectedCount++;
        
        // Check sleep permission
        const hasSleepPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
        );
        if (hasSleepPermission) connectedCount++;
        
        // Check screen time permission
        const hasScreenTimePermission = await ScreenTimeService.checkPermission();
        if (hasScreenTimePermission) connectedCount++;
      }
      
      console.log('🔍 DEBUG: Connected apps count:', connectedCount);
      console.log('🔍 DEBUG: Microsoft connected:', microsoftConnected);
      console.log('🔍 DEBUG: Google Fit (always connected): true');
      
      return connectedCount;
    } catch (error) {
      console.error('Error getting connected apps count:', error);
      return 0;
    }
  }

  // Fallback method to get basic stats if API fails
  async getFallbackStats(): Promise<UserStats | null> {
    try {
      const connectedApps = await this.getConnectedAppsCount();
      
      return {
        days_tracked: 0,
        avg_mood: 0,
        connected_apps: connectedApps
      };
    } catch (error) {
      console.error('Error getting fallback stats:', error);
      return null;
    }
  }
}

export const userService = new UserService();

