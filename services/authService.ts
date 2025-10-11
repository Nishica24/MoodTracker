import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000/api';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserProfile {
  user: User;
  onboarding_complete: boolean;
  has_scores: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ErrorResponse {
  error: string;
  details?: string[];
}

export interface PasswordValidation {
  is_valid: boolean;
  errors: string[];
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;
  private userProfile: UserProfile | null = null;

  constructor() {
    // Load token and user data from storage on initialization
    this.loadAuthData();
  }

  private async loadAuthData() {
    try {
      // Load token and user data from AsyncStorage
      const [storedToken, storedUser, storedProfile] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('auth_user'),
        AsyncStorage.getItem('auth_profile')
      ]);
      
      if (storedToken) {
        this.token = storedToken;
      }
      
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
      
      if (storedProfile) {
        this.userProfile = JSON.parse(storedProfile);
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    }
  }

  private async saveAuthData(token: string, user: User, profile?: UserProfile) {
    try {
      this.token = token;
      this.user = user;
      if (profile) {
        this.userProfile = profile;
      }
      
      // Save all auth data to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('auth_token', token),
        AsyncStorage.setItem('auth_user', JSON.stringify(user)),
        profile ? AsyncStorage.setItem('auth_profile', JSON.stringify(profile)) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  }

  private async clearAuthData() {
    try {
      this.token = null;
      this.user = null;
      this.userProfile = null;
      
      // Clear all auth data from AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem('auth_token'),
        AsyncStorage.removeItem('auth_user'),
        AsyncStorage.removeItem('auth_profile')
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  async register(name: string, email: string, password: string, confirmPassword: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
        confirmPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Save auth data on successful registration
    await this.saveAuthData(data.token, data.user);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Save auth data on successful login
    await this.saveAuthData(data.token, data.user);
    return data;
  }

  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    if (!this.token) {
      return { valid: false };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        await this.clearAuthData();
        return { valid: false };
      }

      return { valid: true, user: data.user };
    } catch (error) {
      console.error('Token verification error:', error);
      await this.clearAuthData();
      return { valid: false };
    }
  }

  async logout() {
    await this.clearAuthData();
  }

  async getUserProfile(): Promise<UserProfile | null> {
    if (!this.user) {
      console.log('🔍 DEBUG: getUserProfile called but no user found');
      return null;
    }

    console.log(`🔍 DEBUG: Getting user profile for user_id=${this.user.id}`);

    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/${this.user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      console.log(`🔍 DEBUG: Profile API response status: ${response.status}`);

      if (!response.ok) {
        console.error(`❌ DEBUG: Profile API failed with status ${response.status}`);
        throw new Error('Failed to fetch user profile');
      }

      const profile = await response.json();
      console.log(`🔍 DEBUG: Profile data received:`, profile);
      
      this.userProfile = profile;
      
      // Update stored profile
      await AsyncStorage.setItem('auth_profile', JSON.stringify(profile));
      console.log('🔍 DEBUG: Profile saved to AsyncStorage');
      
      return profile;
    } catch (error) {
      console.error('❌ DEBUG: Error fetching user profile:', error);
      return null;
    }
  }

  async updateUserScore(scoreData: {
    socialScore?: number;
    workStressScore?: number;
    screenTimePenalty?: number;
    interactionPenalty?: number;
  }): Promise<boolean> {
    if (!this.user) {
      console.log('🔍 DEBUG: updateUserScore called but no user found');
      return false;
    }

    console.log(`🔍 DEBUG: Updating user score for user_id=${this.user.id}`);
    console.log(`🔍 DEBUG: Score data:`, scoreData);

    try {
      const response = await fetch(`${API_BASE_URL}/update-user-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          user_id: this.user.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Get user's timezone
          ...scoreData
        })
      });

      console.log(`🔍 DEBUG: Update score API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ DEBUG: Update score API failed:`, errorData);
      }

      const success = response.ok;
      console.log(`🔍 DEBUG: Score update ${success ? 'successful' : 'failed'}`);
      
      return success;
    } catch (error) {
      console.error('❌ DEBUG: Error updating user score:', error);
      return false;
    }
  }

  async getUserScores(): Promise<any[]> {
    if (!this.user) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/user-scores/${this.user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user scores');
      }

      const data = await response.json();
      return data.scores || [];
    } catch (error) {
      console.error('Error fetching user scores:', error);
      return [];
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getUserProfileData(): UserProfile | null {
    return this.userProfile;
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  // Client-side validation helpers
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      is_valid: errors.length === 0,
      errors,
    };
  }
}

export const authService = new AuthService();
