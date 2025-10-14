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

      // Use the new dedicated stats endpoint
      console.log('🔍 DEBUG: UserService - Making API call to:', `${API_BASE_URL}/user-stats/${userId}`);

      const response = await fetch(`${API_BASE_URL}/user-stats/${userId}`, {
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

      // Return stats directly from backend (no local calculation needed)
      return {
        days_tracked: data.days_tracked || 0,
        avg_mood: data.avg_mood || 0,
        connected_apps: data.connected_apps || 0
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }

  // Fallback method to get basic stats if API fails
  async getFallbackStats(): Promise<UserStats | null> {
    try {
      // Return minimal fallback stats since connected apps calculation is now in backend
      return {
        days_tracked: 0,
        avg_mood: 0,
        connected_apps: 1  // At least Google Fit is always connected
      };
    } catch (error) {
      console.error('Error getting fallback stats:', error);
      return null;
    }
  }
}

export const userService = new UserService();

