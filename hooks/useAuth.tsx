import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User, UserProfile } from '../services/authService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateUserScore: (scoreData: {
    socialScore?: number;
    workStressScore?: number;
    screenTimePenalty?: number;
    interactionPenalty?: number;
  }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app start
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 DEBUG: Checking auth status on app start');
      setIsLoading(true);
      
      // Check if user is authenticated
      const isAuth = authService.isAuthenticated();
      console.log(`🔍 DEBUG: Auth service reports authenticated: ${isAuth}`);
      
      if (isAuth) {
        const currentUser = authService.getCurrentUser();
        const profile = authService.getUserProfileData();
        
        console.log(`🔍 DEBUG: Current user:`, currentUser);
        console.log(`🔍 DEBUG: Cached profile:`, profile);
        
        if (currentUser) {
          setUser(currentUser);
          
          // If we have cached profile, use it, otherwise fetch fresh
          if (profile) {
            console.log('🔍 DEBUG: Using cached profile');
            setUserProfile(profile);
          } else {
            console.log('🔍 DEBUG: Fetching fresh profile from API');
            const freshProfile = await authService.getUserProfile();
            console.log(`🔍 DEBUG: Fresh profile received:`, freshProfile);
            setUserProfile(freshProfile);
          }
        }
      } else {
        console.log('🔍 DEBUG: User not authenticated, clearing state');
        setUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('❌ DEBUG: Error checking auth status:', error);
      // Clear invalid auth data
      await authService.logout();
      setUser(null);
      setUserProfile(null);
    } finally {
      console.log('🔍 DEBUG: Auth status check complete');
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      
      // Fetch user profile to check onboarding status
      const profile = await authService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string) => {
    try {
      const response = await authService.register(name, email, password, confirmPassword);
      setUser(response.user);
      
      // New users won't have profile data yet
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshUserProfile = async () => {
    try {
      const profile = await authService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const updateUserScore = async (scoreData: {
    socialScore?: number;
    workStressScore?: number;
    screenTimePenalty?: number;
    interactionPenalty?: number;
  }) => {
    try {
      const success = await authService.updateUserScore(scoreData);
      if (success) {
        // Refresh profile to get updated data
        await refreshUserProfile();
      }
      return success;
    } catch (error) {
      console.error('Error updating user score:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    isLoading,
    isAuthenticated: authService.isAuthenticated(),
    login,
    register,
    logout,
    refreshUserProfile,
    updateUserScore,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
