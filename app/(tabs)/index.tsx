import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Modal, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatsCard } from '@/components/StatsCard';
import { QuickActions } from '@/components/QuickActions';
import { Heart, Zap, Moon, Smartphone, DollarSign, LucideIcon, Plus, TrendingUp, RefreshCw, Link } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
// --- CORRECTED --- Use relative paths for stability
import { updateDailyHistory } from '../../services/callLogsServices';
import { calculateSocialScore, getHistoricalSocialScores } from '../../scoreFunctions/socialScore';
import { handleCallLogPermission } from '@/services/permissions';
import { SleepPermissionTester } from '@/components/SleepPermissionTester';
import { SleepService, SleepSegment } from '@/services/SleepService';
import { ScreenTimeService, ScreenTimeData, AppUsageData } from '@/services/ScreenTimeService';
import { fetchDashboardScores, fetchWorkStress, handleMicrosoftLogin, checkMicrosoftConnection, setMicrosoftConnectionStatus, getMicrosoftConnectionStatus, setMicrosoftModalShown, getMicrosoftModalShown } from '@/services/microsoftPermission';
import { calculateContextualScreenTimeScore, getScreenTimeInsights } from '@/scoreFunctions/contextualScreenTimeScore';
import { UserProfile, getUserSpecificWeights, DEFAULT_USER_PROFILE } from '@/utils/userProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- NEW FUNCTION ---
/**
 * Returns a greeting based on the current hour of the day.
 */

const getGreeting = (userName?: string): string => {
  const currentHour = new Date().getHours();
  const name = userName ? `, ${userName}` : '';

  if (currentHour < 12) return `Good morning${name}!`;
  if (currentHour < 18) return `Good afternoon${name}!`;
  return `Good evening${name}!`;
};

/**
 * Calculates the social health trend based on recent scores
 */
const calculateSocialTrend = async (): Promise<'up' | 'down' | 'stable'> => {
  try {
    const historicalScores = await getHistoricalSocialScores('week');
    
    if (historicalScores.length < 2) {
      return 'stable'; // Not enough data to determine trend
    }

    // Get the most recent scores (last 3-4 days if available)
    const recentScores = historicalScores.slice(-Math.min(4, historicalScores.length));
    const olderScores = historicalScores.slice(0, -Math.min(4, historicalScores.length));

    if (olderScores.length === 0) {
      return 'stable'; // Not enough historical data
    }

    const recentAverage = recentScores.reduce((sum, item) => sum + item.score, 0) / recentScores.length;
    const olderAverage = olderScores.reduce((sum, item) => sum + item.score, 0) / olderScores.length;

    const difference = recentAverage - olderAverage;
    const threshold = 0.5; // Minimum change to consider significant

    if (difference > threshold) {
      return 'up';
    } else if (difference < -threshold) {
      return 'down';
    } else {
      return 'stable';
    }
  } catch (error) {
    console.error('Error calculating social trend:', error);
    return 'stable';
  }
};

export default function DashboardScreen() {
  const { result } = useLocalSearchParams();
  const data = result ? JSON.parse(result as string) : null;
  const insets = useSafeAreaInsets();
  const { user, updateUserScore } = useAuth();

  console.log('🔍 DEBUG: Dashboard component render');
  console.log(`🔍 DEBUG: Result from params:`, result);
  console.log(`🔍 DEBUG: Parsed data:`, data);
  console.log(`🔍 DEBUG: Current user:`, user);

  const [moodScores, setMoodScores] = useState<any[]>([]);
  const [socialScore, setSocialScore] = useState<number | null>(null);
  const [socialTrend, setSocialTrend] = useState<'up' | 'down' | 'stable'>('stable');
  // --- NEW --- State for the combined overall score
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // --- NEW --- State for Microsoft dashboard scores
  const [dashboardScores, setDashboardScores] = useState<any>(null);
  const [microsoftConnected, setMicrosoftConnected] = useState<boolean>(false);

  // --- NEW STATE FOR SLEEP DATA ---
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepScore, setSleepScore] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'Unknown' | 'Granted' | 'Denied'>('Unknown');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [showScreenTimeModal, setShowScreenTimeModal] = useState<boolean>(false);
  const [showMicrosoftModal, setShowMicrosoftModal] = useState<boolean>(false);
  const [shouldShowMicrosoftModal, setShouldShowMicrosoftModal] = useState<boolean>(false);
  const [screenTimeHoursToday, setScreenTimeHoursToday] = useState<number | null>(null);
  const [screenTimeData, setScreenTimeData] = useState<ScreenTimeData[]>([]);
  const [appUsageData, setAppUsageData] = useState<AppUsageData[]>([]);
  const [contextualScreenTimeScore, setContextualScreenTimeScore] = useState<number | null>(null);
  const [screenTimeInsights, setScreenTimeInsights] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showRefreshOverlay, setShowRefreshOverlay] = useState<boolean>(false);
  const lastCalculatedScore = useRef<string>('');
  const isRefreshingRef = useRef<boolean>(false);

  // Load user profile from AsyncStorage
  const loadUserProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('user_profile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setUserProfile(profile);
        console.log('User profile loaded:', profile);
      } else {
        // Set default profile based on onboarding data if available
        if (data?.age) {
          const age = parseInt(data.age) || 25;
          const role: 'student' | 'working_adult' | 'professional' =
            age < 25 ? 'student' : age < 45 ? 'working_adult' : 'professional';

          const defaultProfile: UserProfile = {
            ...DEFAULT_USER_PROFILE,
            age: age,
            role: role
          };
          setUserProfile(defaultProfile);
          await AsyncStorage.setItem('user_profile', JSON.stringify(defaultProfile));
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(DEFAULT_USER_PROFILE);
    }
  };

  // Helper function to check Microsoft connection with retry
  const checkMicrosoftConnectionWithRetry = async (maxRetries = 3, delayMs = 1000): Promise<boolean> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const isConnected = await checkMicrosoftConnection();
        if (isConnected) {
          return true;
        }
        if (attempt < maxRetries - 1) {
          console.log(`Microsoft connection check attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Microsoft connection check attempt ${attempt + 1} error:`, error);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    return false;
  };
  const fetchScreenTimeSummary = async () => {
    try {
      const hasUsageAccess = await ScreenTimeService.checkPermission();
      if (!hasUsageAccess) {
        setScreenTimeHoursToday(null);
        setScreenTimeData([]);
        setAppUsageData([]);
        setContextualScreenTimeScore(null);
        setScreenTimeInsights([]);
        return;
      }

      const [screenData, appData] = await Promise.all([
        ScreenTimeService.getScreenTimeData(),
        ScreenTimeService.getAppUsageData()
      ]);

      setScreenTimeData(screenData);
      setAppUsageData(appData);

      if (Array.isArray(screenData) && screenData.length > 0) {
        const latest = screenData[screenData.length - 1];
        const hours = latest?.screenTimeHours ?? (latest?.screenTimeMs ? latest.screenTimeMs / (1000 * 60 * 60) : null);
        setScreenTimeHoursToday(typeof hours === 'number' ? Math.round(hours * 10) / 10 : null);
      } else {
        setScreenTimeHoursToday(null);
      }

      // Calculate contextual screen time score
      if (screenData.length > 0 && appData.length > 0) {
        const contextualScore = calculateContextualScreenTimeScore(screenData, appData, userProfile);
        setContextualScreenTimeScore(contextualScore);

        // Get insights
        const insights = getScreenTimeInsights(screenData, appData, userProfile);
        setScreenTimeInsights(insights);
      }
    } catch (e) {
      console.error('Failed to fetch screen time summary:', e);
      setScreenTimeHoursToday(null);
      setScreenTimeData([]);
      setAppUsageData([]);
      setContextualScreenTimeScore(null);
      setScreenTimeInsights([]);
    }
  };

  const formatScreenTime = (hours: number | null): string => {
    if (hours === null || isNaN(hours)) return 'N/A';
    const totalMinutes = Math.max(0, Math.round(hours * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} hrs`;
    return `${h} hrs ${m} mins`;
  };

  // Ensure the modal is dismissed when the dashboard loses focus (e.g., navigating to details)
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setShowScreenTimeModal(false);
      };
    }, [])
  );



  // --- AUTOMATIC SLEEP TRACKING ---
  const startAutomaticTracking = async () => {
    if (permissionStatus === 'Granted' && !isTracking) {
      try {
        await SleepService.startTracking();
        setIsTracking(true);
        console.log('Sleep tracking started automatically');
      } catch (error: any) {
        console.error('Failed to start automatic sleep tracking:', error);
      }
    }
  };

  const stopSleepTracking = async () => {
    try {
      await SleepService.stopTracking();
      setIsTracking(false);
      console.log('Sleep tracking stopped');
    } catch (error: any) {
      console.error('Failed to stop sleep tracking:', error);
    }
  };

  // --- USE EFFECT FOR SLEEP LISTENER ---
  useEffect(() => {
    const subscription = SleepService.addSleepListener(events => {
      console.log('Received Sleep Data:', events);
      const lastNightSleep = events.find(e => e.status === 1);
      if (lastNightSleep) {
        const durationHours = (lastNightSleep.endTimeMillis - lastNightSleep.startTimeMillis) / (1000 * 60 * 60);
        setSleepHours(durationHours);

        // Simple scoring logic
        if (durationHours < 4) setSleepScore(40);
        else if (durationHours < 6) setSleepScore(65);
        else if (durationHours <= 9) setSleepScore(95);
        else setSleepScore(80);
      }
    });

    // Clean up the listener when the component unmounts
    return () => {
      subscription.remove();
    };
  }, []);

  // --- NEW FUNCTION --- Fetch user scores from database
    const fetchUserScoresFromDB = async () => {
      // Return null if there is no user ID available
      if (!user?.id) {
        console.log('🔍 DEBUG: No user ID available for fetching scores');
        return null;
      }

      try {
        console.log(`🔍 DEBUG: Fetching user scores for user_id=${user.id}`);
        const response = await fetch(`http://localhost:5000/api/user-scores/${user.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        // Handle server errors or unsuccessful responses
        if (!response.ok) {
          console.error(`❌ DEBUG: Failed to fetch user scores: ${response.status}`);
          return null;
        }

        const result = await response.json();
        console.log(`🔍 DEBUG: User scores from DB:`, result);

        // Return the entire JSON object from the API.
        // The calling function will be responsible for processing this data.
        return result;

      } catch (error) {
        console.error('❌ DEBUG: Error fetching user scores:', error);
        return null;
      }
    };

  // This useEffect handles the initial data loading and call log processing
  useEffect(() => {

    const initializeDashboard = async () => {
        console.log('🔍 DEBUG: Initializing dashboard');
        setIsLoading(true);

        // Load user profile first
        await loadUserProfile();

        // --- Initial logic for mood data ---
        let moodData = data; // From onboarding params

        // If no data from params (returning user), fetch from database
        if (!moodData && user?.id) {
          console.log('🔍 DEBUG: No params data, fetching from database');
          const dbResult = await fetchUserScoresFromDB(); // This now returns the full {scores: [...]} object

          // Check if the API returned a valid result with at least one score
          if (dbResult && dbResult.scores && dbResult.scores.length > 0) {

            // Your backend already sorts by date, so the first item is the most recent score.
            const mostRecentScore = dbResult.scores[0];

            moodData = {
              // Use the data from the most recent score
              mood: mostRecentScore.breakdown?.moodName || 'Neutral',
              mood_level: mostRecentScore.breakdown?.moodLevel || 5,
              emoji: mostRecentScore.breakdown?.emoji || '😊',
              timestamp: mostRecentScore.updatedAt
            };
            console.log(`🔍 DEBUG: Using most recent DB mood data from ${mostRecentScore.date}:`, moodData);
          }
        }

        if (moodData) {
          console.log(`🔍 DEBUG: Setting mood data:`, moodData);
          const mockMoodScores = [{
              emotion: moodData.mood?.toLowerCase() || 'neutral',
              confidence: moodData.mood_level ? moodData.mood_level / 10 : 0.5,
              percentage: moodData.mood_level ? moodData.mood_level * 10 : 50
          }];
          setMoodScores(mockMoodScores);
          // --- NEW --- Set the initial overall score based on mood level alone
          setOverallScore(moodData.mood_level || 5);
        } else {
          console.log('🔍 DEBUG: No mood data available, using defaults');
          setOverallScore(5);
        }

      // --- CALL LOG PERMISSION LOGIC ---
      // Step 1: Request call log permission as soon as the screen loads.
      const callLogPermissionGranted = await handleCallLogPermission();

      // Step 2: Only proceed if permission was granted.
      if (callLogPermissionGranted) {
          console.log("Call Log permission granted. Calculating social score...");
          try {
            // First, ensure the daily history is up-to-date.
            await updateDailyHistory();

            // Then, calculate the social score.
            const score = await calculateSocialScore();
            setSocialScore(score); // This will trigger the other useEffect
            
            // Calculate the social trend
            const trend = await calculateSocialTrend();
            setSocialTrend(trend);

          } catch (error) {
            console.error("Failed to calculate social score:", error);
            setSocialScore(5.0); // Set a neutral score on error
          }
      } else {
        // If permission is denied, we can't calculate the score.
        console.log("Call Log permission denied. Social score will not be shown.");
        setSocialScore(null); // Set to null to show '...' or 'N/A' in the UI
        
      }

      // --- SLEEP PERMISSION LOGIC ---
      // Step 3: Request sleep permission automatically after call logs
      try {
        const sleepPermissionGranted = await SleepService.requestPermission();
        setPermissionStatus(sleepPermissionGranted ? 'Granted' : 'Denied');
        console.log("Sleep permission result:", sleepPermissionGranted ? 'Granted' : 'Denied');
      } catch (error) {
        console.error("Sleep permission request error:", error);
        setPermissionStatus('Denied');
      }

      // --- SCREEN TIME PERMISSION LOGIC ---
      // Step 4: Show custom modal like native prompt; opens settings on Allow
      try {
        const hasUsageAccess = await ScreenTimeService.checkPermission();
        if (!hasUsageAccess) {
          setShowScreenTimeModal(true);
        } else {
          await fetchScreenTimeSummary();
        }
      } catch (error) {
        console.error('Screen Time permission check/request error:', error);
      }

      // --- MICROSOFT DASHBOARD SCORES ---
      // Step 5: Check actual Microsoft connection status (like other connections do)
      try {
        const microsoftConnected = await checkMicrosoftConnection();
        console.log('Microsoft connection check - Backend status:', microsoftConnected);

        setMicrosoftConnected(microsoftConnected);

        if (microsoftConnected) {
          // Backend says user is connected, try to fetch data
          console.log('Backend indicates Microsoft is connected, fetching data...');
          try {
            const scores = await fetchDashboardScores();
            setDashboardScores(scores);
            console.log('Microsoft dashboard scores loaded:', scores);
          } catch (fetchError) {
            console.error('Failed to fetch Microsoft scores despite backend connection:', fetchError);
            // Don't disconnect - just show that data is temporarily unavailable
            setDashboardScores(null);
            console.log('Microsoft data temporarily unavailable, but connection status preserved');
          }
        } else {
          // Backend says not connected, check if we should show modal
          setDashboardScores(null);
          const hasBeenShown = await getMicrosoftModalShown();
          if (!hasBeenShown) setShouldShowMicrosoftModal(true);
        }
      } catch (error) {
        console.error('Microsoft connection check failed:', error);
        // On error, assume not connected and clear data
        setMicrosoftConnected(false);
        setDashboardScores(null);
        
        // Show modal if user hasn't seen it before
        const hasBeenShown = await getMicrosoftModalShown();
        if (!hasBeenShown) setShouldShowMicrosoftModal(true);
      }

      setIsLoading(false);
    }

    initializeDashboard();
  }, [user?.id]); // Add user.id as dependency to re-run when user changes

  // --- HELPERS: scoring conversions ---
  const computeWeightedAverage = (parts: Array<{ value: number | null; weight: number }>): number | null => {
    const available = parts.filter(p => typeof p.value === 'number' && !isNaN(p.value as number));
    if (available.length === 0) return null;
    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight === 0) return null;
    const weighted = available.reduce((sum, p) => sum + (p.value as number) * p.weight, 0);
    return weighted / totalWeight;
  };

  // --- OVERALL SCORE: include mood, social, work stress, contextual screen time ---
  useEffect(() => {
    if (!data?.mood_level) return;

    // Base mood (0-10, higher is better)
    const mood = data.mood_level as number;

    // Social score (0-10, higher is better)
    const social = socialScore;

    // Work stress comes as 1-10 (higher = more stress). Convert to wellbeing: 10 - stress
    const workStressRaw: number | null = dashboardScores?.work_stress?.score ?? null;
    const workWellbeing: number | null = typeof workStressRaw === 'number' ? Math.max(0, Math.min(10, 10 - workStressRaw)) : null;

    // Use contextual screen time score if available, otherwise fallback to simple calculation
    let screenWellbeing: number | null = null;
    if (contextualScreenTimeScore !== null) {
      screenWellbeing = contextualScreenTimeScore;
    } else if (screenTimeHoursToday !== null) {
      // Fallback: map hours to wellbeing (0h->10, 9h->~2)
      const clampedHours = Math.max(0, Math.min(9, screenTimeHoursToday));
      screenWellbeing = 10 - (clampedHours * (8 / 9));
    }

    // Get user-specific weights
    const weights = getUserSpecificWeights(userProfile.age, userProfile.role);

    // Weights (automatically re-normalized for missing parts)
    const parts = [
      { value: mood, weight: weights.mood },
      { value: social, weight: weights.social },
      { value: workWellbeing, weight: weights.workStress },
      { value: screenWellbeing, weight: weights.screenTime },
    ];

    const combined = computeWeightedAverage(parts);
    if (combined !== null) {
      setOverallScore(combined);

      // Create a unique key for this calculation to prevent duplicate logging
      const scoreKey = `${mood}-${social}-${workWellbeing}-${screenWellbeing}-${userProfile.age}-${userProfile.role}`;

      // Only log if:
      // 1. The score actually changed AND
      // 2. We're not currently refreshing (to avoid multiple logs during refresh)
      if (lastCalculatedScore.current !== scoreKey && !isRefreshingRef.current) {
        console.log(
          `Overall Score → ${combined.toFixed(1)} (Mood: ${mood}${typeof social === 'number' ? `, Social: ${social}` : ''}${typeof workWellbeing === 'number' ? `, WorkWellbeing: ${workWellbeing}` : ''}${typeof screenWellbeing === 'number' ? `, ScreenWellbeing: ${screenWellbeing}` : ''}) [Weights: ${JSON.stringify(weights)}]`
        );
        lastCalculatedScore.current = scoreKey;
      }
    } else {
      setOverallScore(mood);
    }
  }, [data, socialScore, dashboardScores, contextualScreenTimeScore, screenTimeHoursToday, userProfile.age, userProfile.role]);


  // --- AUTOMATIC SLEEP TRACKING ---
  useEffect(() => {
    if (permissionStatus === 'Granted' && !isTracking) {
      startAutomaticTracking();
    } else if (permissionStatus === 'Denied' && isTracking) {
      stopSleepTracking();
    }
  }, [permissionStatus]);

  // --- REFRESH ALL SCORES ---
  const refreshAllScores = async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes
    
    try {
      setIsRefreshing(true);
      isRefreshingRef.current = true; // Set ref flag
      setShowRefreshOverlay(true); // Show full page loading overlay
      console.log('🔍 DEBUG: Refreshing all dashboard scores...');
      
      // Try to refresh Microsoft scores (check actual backend status like other connections)
      const microsoftConnected = await checkMicrosoftConnection();
      setMicrosoftConnected(microsoftConnected);
      
      if (microsoftConnected) {
        try {
          const scores = await fetchDashboardScores();
          setDashboardScores(scores);
          console.log('Microsoft scores refreshed:', scores);
        } catch (error) {
          console.error('Failed to refresh Microsoft scores:', error);
          // Don't disconnect - just clear data temporarily
          setDashboardScores(null);
          console.log('Microsoft data temporarily unavailable during refresh, but connection status preserved');
        }
      } else {
        // Not connected, clear data
        setDashboardScores(null);
        console.log('Microsoft not connected, cleared work stress data');
      }

      // Always refresh social score
      try {
        await updateDailyHistory();
        const socialScore = await calculateSocialScore();
        setSocialScore(socialScore);
        const trend = await calculateSocialTrend();
        setSocialTrend(trend);
        console.log(`🔍 DEBUG: Social score refreshed: ${socialScore}`);

        // Update user score in database
        if (user?.id && socialScore !== null) {
          console.log(`🔍 DEBUG: Updating social score in DB: ${socialScore}`);
          await updateUserScore({
            socialScore: socialScore
          });
        }
      } catch (error) {
        console.error('❌ DEBUG: Failed to refresh social score:', error);
      }

      // Always refresh screen time data
      try {
        await fetchScreenTimeSummary();
        console.log('🔍 DEBUG: Screen time data refreshed');

        // Update user score in database with screen time penalty
        if (user?.id && screenTimeHoursToday !== null) {
          const penalty = Math.max(0, (screenTimeHoursToday - 6) * 0.5); // Penalty for > 6 hours
          console.log(`🔍 DEBUG: Updating screen time penalty in DB: ${penalty}`);
          await updateUserScore({
            screenTimePenalty: penalty
          });
        }
      } catch (error) {
        console.error('❌ DEBUG: Failed to refresh screen time:', error);
      }

      // Always recalculate contextual screen time score after fetching fresh data
      // This will use the fresh screenTimeData and appUsageData from fetchScreenTimeSummary
      try {
        // Get fresh data for contextual calculation
        const [freshScreenData, freshAppData] = await Promise.all([
          ScreenTimeService.getScreenTimeData(),
          ScreenTimeService.getAppUsageData()
        ]);

        if (freshScreenData.length > 0 && freshAppData.length > 0) {
          const contextualScore = calculateContextualScreenTimeScore(freshScreenData, freshAppData, userProfile);
          setContextualScreenTimeScore(contextualScore);

          const insights = getScreenTimeInsights(freshScreenData, freshAppData, userProfile);
          setScreenTimeInsights(insights);
          console.log('Contextual screen time score refreshed:', contextualScore);
        } else {
          setContextualScreenTimeScore(null);
          setScreenTimeInsights([]);
          console.log('No screen time data available for contextual calculation');
        }
      } catch (error) {
        console.error('Failed to refresh contextual screen time score:', error);
        setContextualScreenTimeScore(null);
        setScreenTimeInsights([]);
      }

      // Refresh sleep data (if permission granted)
      if (permissionStatus === 'Granted') {
        try {
          // Sleep data refreshes automatically via listener, but we can trigger a check
          console.log('🔍 DEBUG: Sleep data is being tracked automatically');

          // Update user score in database with sleep score
          if (user?.id && sleepScore !== null) {
            console.log(`🔍 DEBUG: Updating sleep score in DB: ${sleepScore}`);
            await updateUserScore({
              interactionPenalty: 0 // Sleep is positive, no penalty
            });
          }
        } catch (error) {
          console.error('❌ DEBUG: Failed to refresh sleep data:', error);
        }
      }

      console.log('All scores refreshed successfully!');

      // Log the final score after a brief delay to ensure all state updates are complete
      setTimeout(() => {
        if (overallScore !== null) {
          const mood = data?.mood_level as number;
          const social = socialScore;
          const workStressRaw: number | null = dashboardScores?.work_stress?.score ?? null;
          const workWellbeing: number | null = typeof workStressRaw === 'number' ? Math.max(0, Math.min(10, 10 - workStressRaw)) : null;
          const screenWellbeing = contextualScreenTimeScore !== null ? contextualScreenTimeScore :
            (screenTimeHoursToday !== null ? 10 - (Math.max(0, Math.min(9, screenTimeHoursToday)) * (8 / 9)) : null);
          const weights = getUserSpecificWeights(userProfile.age, userProfile.role);

          console.log(
            `Overall Score → ${overallScore.toFixed(1)} (Mood: ${mood}${typeof social === 'number' ? `, Social: ${social}` : ''}${typeof workWellbeing === 'number' ? `, WorkWellbeing: ${workWellbeing}` : ''}${typeof screenWellbeing === 'number' ? `, ScreenWellbeing: ${screenWellbeing}` : ''}) [Weights: ${JSON.stringify(weights)}]`
          );
        }
      }, 100);

      console.log('🔍 DEBUG: All scores refreshed successfully!');
    } catch (error) {
      console.error('❌ DEBUG: Error refreshing all scores:', error);
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false; // Clear ref flag
      // Add a small delay before hiding overlay for better UX
      setTimeout(() => {
        setShowRefreshOverlay(false);
      }, 500);
    }
  };

  // --- CONNECT MICROSOFT ACCOUNT ---
  const connectMicrosoftAccount = async () => {
    try {
      console.log('Starting Microsoft login...');
      setShowMicrosoftModal(false); // Close modal first
      await setMicrosoftModalShown(true); // Mark as shown regardless of connection result
      const connected = await handleMicrosoftLogin();
      if (connected) {
        console.log('Microsoft account connected successfully!');
        setMicrosoftConnected(true);
        // Save connection status to shared storage for Connections tab
        await setMicrosoftConnectionStatus(true);

        // Immediately fetch Microsoft data after successful connection
        try {
          const scores = await fetchDashboardScores();
          setDashboardScores(scores);
          console.log('Microsoft dashboard scores loaded after connection:', scores);
        } catch (fetchError) {
          console.error('Failed to fetch Microsoft scores after connection:', fetchError);
          // Don't reset connection status, just log the error
          // User can manually refresh if needed
        }
      } else {
        console.log('Microsoft login failed or was cancelled');
        setMicrosoftConnected(false);
        await setMicrosoftConnectionStatus(false);
      }
    } catch (error) {
      console.error('Microsoft login error:', error);
      setMicrosoftConnected(false);
      await setMicrosoftConnectionStatus(false);
    }
  };

  // --- AUTO REFRESH ALL SCORES EVERY 5 MINUTES ---
  useEffect(() => {
    const interval = setInterval(refreshAllScores, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  // --- HANDLE SCREEN TIME MODAL DISMISSAL ---
  useEffect(() => {
    if (!showScreenTimeModal && shouldShowMicrosoftModal && !microsoftConnected) {
      // Show Microsoft modal after Screen Time modal is dismissed
      setTimeout(() => {
        setShowMicrosoftModal(true);
        setShouldShowMicrosoftModal(false);
      }, 500); // Small delay for smooth transition
    }
  }, [showScreenTimeModal, shouldShowMicrosoftModal, microsoftConnected]);

  
  // Generate dynamic stats based on mood scores
  const getDynamicStats = (): Array<{
    icon: LucideIcon;
    title: string;
    value: string;
    subtitle: string;
    color: string;
    trend: 'up' | 'stable' | 'down';
    onPress?: () => void;
  }> => {
    // Always return wellness stats, even if moodScores is empty
    // This ensures the wellness stats section is always visible
    return [
      {
        icon: Heart,
        title: 'Social Health',
        // --- UPDATED --- Handle the null case for socialScore
        value: socialScore !== null ? `${socialScore.toFixed(1)}` : 'N/A',
        subtitle: socialScore !== null ? 'vs. your average' : 'Permission needed',
        color: '#EF4444',
        trend: socialTrend,
        onPress: () => router.push('./social-health')
      },
      {
        icon: DollarSign,
        title: 'Spending Wellness',
        value: '$247',
        subtitle: 'This week',
        color: '#10B981',
        trend: 'stable',
        onPress: () => router.push('./spending-wellness')
      },
      {
        icon: Zap,
        title: 'Work Stress',
        value: dashboardScores?.work_stress?.score ? `${dashboardScores.work_stress.score}/10` : '…',
        subtitle: dashboardScores?.work_stress?.level ? `${dashboardScores.work_stress.level} level` : 'Connect Microsoft to view',
        color: '#F59E0B',
        trend: dashboardScores?.work_stress?.trend ?? 'stable',
        onPress: () => router.push('./work-stress')
      },
      {
        icon: Moon,
        title: 'Sleep Quality',
        value: sleepScore ? `${(sleepScore / 10).toFixed(1)}/10` : 'N/A',
        subtitle: sleepHours ? `${sleepHours.toFixed(1)}h last night` : 'No data yet',
        color: '#8B5CF6',
        trend: 'up',
        onPress: () => router.push('./sleep-quality')
      },
      {
        icon: Smartphone,
        title: 'Screen Time',
        value: formatScreenTime(screenTimeHoursToday),
        subtitle: 'Today',
        color: '#06B6D4',
        trend: 'down',
        onPress: () => {
          setShowScreenTimeModal(false);
          router.push('./screen-time');
        }
      },
    ];
  };

  const stats = getDynamicStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting(userProfile.name)}</Text>
              <Text style={styles.subtitle}>How are you feeling today?</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]} 
                onPress={refreshAllScores}
                disabled={isRefreshing}
              >
                <RefreshCw 
                  size={20} 
                  color={isRefreshing ? "#9CA3AF" : "#6366F1"} 
                  style={isRefreshing ? styles.refreshIconSpinning : null}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Current Mood Card - Integrated with your backend data */}
        <View style={styles.moodCard}>
          <View style={styles.moodCardHeader}>
            <Text style={styles.moodCardTitle}>Current Mood</Text>
            <TouchableOpacity style={styles.addButton}>
              <Plus size={20} color="#6366F1" />
            </TouchableOpacity>
          </View>

          <View style={styles.moodDisplay}>
            <Text style={styles.moodEmoji}>
              {data?.emoji || '😊'}
            </Text>
            <View style={styles.moodInfo}>
              <Text style={styles.moodLabel}>
                {data?.mood || 'Neutral'}
              </Text>
              <Text style={styles.moodDate}>
                {data?.timestamp ? new Date(data.timestamp).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }) : 'Today, 03:16'}
              </Text>
            </View>
          </View>

          {/* AI Analysis Section */}
          <View style={styles.aiAnalysisSection}>
            <Text style={styles.aiAnalysisTitle}>AI Analysis</Text>
            <Text style={styles.aiAnalysisPrimary}>
              Primary: {data?.mood || 'Neutral'} ({data?.mood_level ? Math.round((data.mood_level / 10) * 100) : 80}%)
            </Text>
            <View style={styles.aiAnalysisTag}>
              <Text style={styles.aiAnalysisTagText}>
                {data?.mood || 'Neutral'} {data?.mood_level ? Math.round((data.mood_level / 10) * 100) : 80}%
              </Text>
            </View>
          </View>

          {/* --- MODIFIED Mood Level Section --- */}
          <View style={styles.moodLevelSection}>
            <Text style={styles.moodLevelTitle}>Overall Mood Level</Text>
            <View style={styles.moodLevelBar}>
              <View
                style={[
                  styles.moodLevelFill,
                  { width: `${((overallScore || 5) / 10) * 100}%` }
                ]}
              />
            </View>
            <View style={styles.moodLevelIndicator}>
              <Text style={styles.moodLevelText}>
                {overallScore ? overallScore.toFixed(1) : '5.0'}/10
              </Text>
              <View style={styles.trendContainer}>
                <TrendingUp size={16} color="#10B981" />
                <Text style={styles.trendText}>+0.5</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Wellness Stats</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <StatsCard
                key={index}
                icon={stat.icon}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                color={stat.color}
                trend={stat.trend}
                onPress={stat.onPress}
                showViewDetails={true}
              />
            ))}
          </View>
        </View>



        {/* Quick Actions */}
        <QuickActions />
      </ScrollView>

      {/* Screen Time Permission Modal */}
      <Modal
        transparent
        visible={showScreenTimeModal}
        animationType="slide"
        onRequestClose={() => setShowScreenTimeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.permissionSheet}>
            <View style={styles.permissionIconWrap}>
              <Smartphone size={28} color="#2563EB" />
            </View>
            <Text style={styles.permissionText}>Allow <Text style={{ fontWeight: '700' }}>Mood Tracker</Text> to access your app usage?</Text>
            <View style={styles.permissionButtons}>
              <TouchableOpacity
                style={[styles.permissionButton, styles.primaryButton]}
                onPress={async () => {
                  setShowScreenTimeModal(false);
                  const wasAlreadyGranted = await ScreenTimeService.requestPermission();
                  if (!wasAlreadyGranted) {
                    setTimeout(async () => {
                      const nowGranted = await ScreenTimeService.checkPermission();
                      console.log('Screen Time permission after prompt:', nowGranted ? 'Granted' : 'Denied');
                      if (nowGranted) {
                        await fetchScreenTimeSummary();
                      }
                    }, 1500);
                  }
                  else {
                    await fetchScreenTimeSummary();
                  }
                }}
              >
                <Text style={styles.primaryButtonText}>Allow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.permissionButton, styles.secondaryButton]}
                onPress={() => setShowScreenTimeModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Don't allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Microsoft Connection Modal */}
      <Modal
        transparent
        visible={showMicrosoftModal}
        animationType="slide"
        onRequestClose={() => setShowMicrosoftModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.permissionSheet}>
            <View style={styles.permissionIconWrap}>
              <Link size={28} color="#2563EB" />
            </View>
            <Text style={styles.permissionText}>Allow <Text style={{ fontWeight: '700' }}>Mood Tracker</Text> to access your Microsoft account?</Text>
            <Text style={styles.permissionSubtext}>
              We'll analyze your calendar events and emails to provide real-time wellness insights.
            </Text>
            <View style={styles.permissionButtons}>
              <TouchableOpacity
                style={[styles.permissionButton, styles.primaryButton]}
                onPress={connectMicrosoftAccount}
              >
                <Text style={styles.primaryButtonText}>Allow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.permissionButton, styles.secondaryButton]}
                onPress={async () => {
                  setShowMicrosoftModal(false);
                  await setMicrosoftModalShown(true); // Mark as shown so it won't appear again
                }}
              >
                <Text style={styles.secondaryButtonText}>Don't allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Refresh Overlay */}
      {showRefreshOverlay && (
        <View style={styles.refreshOverlay}>
          <View style={styles.refreshOverlayContent}>
            <RefreshCw size={32} color="#6366F1" style={styles.refreshOverlayIcon} />
            <Text style={styles.refreshOverlayText}>Updating scores...</Text>
            <Text style={styles.refreshOverlaySubtext}>Please wait while we refresh your wellness data</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },
  
  // Header styles
  header: { paddingHorizontal: 24, paddingBottom: 32 },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 8
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  refreshIconSpinning: {
    transform: [{ rotate: '360deg' }],
  },
  liveDataIndicator: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    alignSelf: 'center'
  },
  greeting: { fontSize: 28, fontWeight: '700', color: '#1F2937', marginBottom: 8, marginTop: 10 },
  subtitle: { fontSize: 16, color: '#6B7280' },
  
  // Mood Card styles - matching the original design
  moodCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20, 
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  moodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moodEmoji: {
    fontSize: 48,
  },
  moodInfo: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  moodDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  
  // AI Analysis Section
  aiAnalysisSection: {
    gap: 8,
  },
  aiAnalysisTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  aiAnalysisPrimary: {
    fontSize: 16, 
    fontWeight: '600',
    color: '#6366F1',
  },
  aiAnalysisTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  aiAnalysisTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  
  // Mood Level Section
  moodLevelSection: {
    gap: 8,
  },
  moodLevelTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  moodLevelBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodLevelFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  moodLevelIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodLevelText: {
    fontSize: 16, 
    fontWeight: '600',
    color: '#1F2937',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  
  // Stats section styles
  statsContainer: { paddingHorizontal: 24, marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  statsGrid: { flexDirection: 'column', gap: 16 },
  
  // Permission modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  permissionSheet: {
    backgroundColor: '#111827',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 16,
  },
  permissionIconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  permissionButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: 'white',
  },
  primaryButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Refresh overlay styles
  refreshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  refreshOverlayContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 280,
  },
  refreshOverlayIcon: {
    marginBottom: 16,
    transform: [{ rotate: '360deg' }],
  },
  refreshOverlayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  refreshOverlaySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  
});