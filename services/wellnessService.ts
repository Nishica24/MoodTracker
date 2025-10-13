import { ScreenTimeService, ScreenTimeData } from './ScreenTimeService';
import { getHistoricalSocialScores } from '../scoreFunctions/socialScore';
import { getUserSpecificWeights } from '../utils/userProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WellnessData {
  date: string;
  socialScore: number;
  screenTimeScore: number;
  workStressScore: number;
  sleepScore: number;
  overallMood: number;
}

export interface WellnessChartData {
  labels: string[];
  data: number[];
  average: number;
  breakdown: {
    mood: number[];
    social: number[];
    screenTime: number[];
    workStress: number[];
  };
}

// Cache for wellness data
let wellnessCache: { data: WellnessChartData; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache


/**
 * Get work stress data from the same source as dashboard
 */
const getWorkStressData = async (period: string): Promise<Array<{date: string, score: number}>> => {
  try {
    // Get device ID for dashboard scores
    const deviceId = await AsyncStorage.getItem('device_id') || 'default-device';
    const API_BASE_URL = 'https://moodtracker-9ygs.onrender.com';
    const response = await fetch(`${API_BASE_URL}/dashboard/scores?device_id=${encodeURIComponent(deviceId)}`);
    
    if (!response.ok) {
      console.log('Failed to fetch work stress data from dashboard API');
      return [];
    }
    
    const data = await response.json();
    
    if (!data.work_stress) {
      console.log('No work stress data in dashboard response');
      return [];
    }
    
    // For now, use the current work stress score for all 7 days
    // In the future, we could implement historical work stress data
    const last7Days = getLastNDays(7);
    const workStressScore = data.work_stress.score || 5.0;
    
    return last7Days.map(date => ({
      date,
      score: workStressScore
    }));
    
  } catch (error) {
    console.error('Error fetching work stress data:', error);
    return [];
  }
};


/**
 * Helper function to get date from label
 */
const getDateFromLabel = (label: string, period: string): string => {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayIndex = dayNames.indexOf(label);
  
  if (dayIndex === -1) {
    // If label is not a day name, return today's date
    return today.toISOString().split('T')[0];
  }
  
  // Calculate the date for this day of the week
  const currentDay = today.getDay();
  const daysDiff = dayIndex - currentDay;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysDiff);
  
  return targetDate.toISOString().split('T')[0];
};

/**
 * Helper function to get last N days
 */
const getLastNDays = (n: number): string[] => {
  const days = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }
  
  return days;
};

/**
 * Get user profile data
 */
const getUserProfile = async (): Promise<{age: number, role: string}> => {
  try {
    const profileJson = await AsyncStorage.getItem('user_profile');
    if (profileJson) {
      const profile = JSON.parse(profileJson);
      return {
        age: profile.age || 25,
        role: profile.role || 'working_adult'
      };
    }
    return { age: 25, role: 'working_adult' };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { age: 25, role: 'working_adult' };
  }
};

/**
 * Get mood data from the same source as dashboard
 */
const getMoodData = async (period: string): Promise<Array<{date: string, score: number}>> => {
  try {
    // Get user ID from auth
    const userJson = await AsyncStorage.getItem('user');
    if (!userJson) {
      console.log('No user found, using mock mood data');
      return [];
    }
    
    const user = JSON.parse(userJson);
    const userId = user.id;
    
    // Fetch mood data from the same API endpoint as dashboard
    const API_BASE_URL = 'https://moodtracker-9ygs.onrender.com';
    const response = await fetch(`${API_BASE_URL}/api/user-scores/${userId}`);
    
    if (!response.ok) {
      console.log('Failed to fetch mood data from API, using mock data');
      return [];
    }
    
    const data = await response.json();
    
    if (!data.scores || data.scores.length === 0) {
      console.log('No mood scores found in database');
      return [];
    }
    
    // Convert to our format - get last 7 days
    const last7Days = getLastNDays(7);
    const moodScores: Array<{date: string, score: number}> = [];
    
    // Create a map of existing scores by date
    const scoreMap = new Map();
    data.scores.forEach((score: any) => {
      const date = score.date.split('T')[0]; // Extract date part
      scoreMap.set(date, score.breakdown?.moodLevel || 5);
    });
    
    // Fill in the last 7 days
    last7Days.forEach(date => {
      const score = scoreMap.get(date) || 5.0; // Default to neutral if no data
      moodScores.push({ date, score });
    });
    
    console.log('Real mood data fetched:', moodScores);
    return moodScores;
    
  } catch (error) {
    console.error('Error fetching mood data:', error);
    return [];
  }
};

/**
 * Get comprehensive wellness data for the last 7 days
 */
export const getWellnessData = async (period: string = 'week'): Promise<WellnessChartData> => {
  try {
    // Check cache first
    const now = Date.now();
    if (wellnessCache && (now - wellnessCache.timestamp) < CACHE_DURATION) {
      console.log('Returning cached wellness data');
      return wellnessCache.data;
    }

    console.log('Fetching fresh wellness data...');

    // Get user profile for weights
    const userProfile = await getUserProfile();

    // Fetch data from all sources in parallel
    const [
      socialScores,
      screenTimeData,
      workStressData,
      moodData
    ] = await Promise.all([
      getHistoricalSocialScores(period),
      ScreenTimeService.getScreenTimeData().catch(() => []),
      getWorkStressData(period),
      getMoodData(period)
    ]);

    console.log('Wellness data fetched:', {
      social: socialScores.length,
      screenTime: screenTimeData.length,
      workStress: workStressData.length,
      mood: moodData.length
    });

    // Get the last 7 days
    const last7Days = getLastNDays(7);
    
    // Create a map for easy lookup
    const socialMap = new Map(socialScores.map(item => [item.date, item.score]));
    const screenTimeMap = new Map(screenTimeData.map(item => [item.date, item.screenTimeHours]));
    const workStressMap = new Map(workStressData.map(item => [item.date, item.score]));
    const moodMap = new Map(moodData.map(item => [item.date, item.score]));

    // Get user-specific weights (same as dashboard)
    const weights = getUserSpecificWeights(userProfile.age, userProfile.role as any);

    // Process each day
    const labels: string[] = [];
    const overallMood: number[] = [];
    const breakdown = {
      mood: [] as number[],
      social: [] as number[],
      screenTime: [] as number[],
      workStress: [] as number[]
    };

    last7Days.forEach(date => {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      labels.push(dayName);

      // Get scores for this day (same as dashboard logic)
      const mood = moodMap.get(date) || 5.0; // Default neutral mood
      const social = socialMap.get(date) || 5.0; // Default neutral social score
      const screenTimeHours = screenTimeMap.get(date) || 4.0; // Default 4 hours
      const workStressRaw = workStressMap.get(date) || 5.0; // Default moderate stress

      // Calculate screen time wellness score (same as dashboard)
      let screenWellbeing: number;
      if (screenTimeHours <= 2) {
        screenWellbeing = 10;
      } else if (screenTimeHours <= 4) {
        screenWellbeing = 10 - (screenTimeHours - 2) * 0.5;
      } else if (screenTimeHours <= 6) {
        screenWellbeing = 9 - (screenTimeHours - 4) * 1;
      } else if (screenTimeHours <= 8) {
        screenWellbeing = 7 - (screenTimeHours - 6) * 1.5;
      } else {
        screenWellbeing = Math.max(1, 4 - (screenTimeHours - 8) * 0.5);
      }

      // Convert work stress to wellbeing (same as dashboard: 10 - stress)
      const workWellbeing = Math.max(0, Math.min(10, 10 - workStressRaw));

      // Store breakdown
      breakdown.mood.push(mood);
      breakdown.social.push(social);
      breakdown.screenTime.push(screenWellbeing);
      breakdown.workStress.push(workWellbeing);

      // Calculate overall score using dashboard weights (same as dashboard)
      const parts = [
        { value: mood, weight: weights.mood },
        { value: social, weight: weights.social },
        { value: workWellbeing, weight: weights.workStress },
        { value: screenWellbeing, weight: weights.screenTime },
      ];

      // Filter available parts and calculate weighted average (same as dashboard)
      const available = parts.filter(p => typeof p.value === 'number' && !isNaN(p.value as number));
      if (available.length === 0) {
        overallMood.push(mood); // Fallback to mood only
      } else {
        const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
        const weighted = available.reduce((sum, p) => sum + (p.value as number) * p.weight, 0);
        const overallScore = totalWeight > 0 ? weighted / totalWeight : mood;
        
        // Debug logging for today's score
        if (date === new Date().toISOString().split('T')[0]) {
          console.log(`🔍 Analytics Chart Debug - Today's Score Calculation:`, {
            date,
            mood,
            social,
            screenTimeHours,
            screenWellbeing,
            workStressRaw,
            workWellbeing,
            weights,
            parts: parts.map(p => ({ value: p.value, weight: p.weight })),
            totalWeight,
            weighted,
            overallScore: Math.round(overallScore * 10) / 10
          });
        }
        
        overallMood.push(Math.round(overallScore * 10) / 10);
      }
    });

    // Calculate average
    const average = overallMood.length > 0 
      ? overallMood.reduce((sum, score) => sum + score, 0) / overallMood.length 
      : 0;

    const result: WellnessChartData = {
      labels,
      data: overallMood,
      average: Math.round(average * 10) / 10,
      breakdown
    };

    // Cache the result
    wellnessCache = { data: result, timestamp: now };

    console.log('Wellness data processed:', result);
    return result;

  } catch (error) {
    console.error('Error fetching wellness data:', error);
    
    // Return fallback data (matching dashboard structure)
    const fallbackData: WellnessChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [4.2, 4.5, 3.8, 5.1, 4.7, 5.3, 4.9],
      average: 4.6,
      breakdown: {
        mood: [6.5, 7.2, 5.8, 8.1, 7.5, 8.3, 7.7],
        social: [5.2, 6.1, 4.8, 7.2, 6.5, 6.9, 6.8],
        screenTime: [6.5, 7.2, 5.1, 8.8, 7.0, 7.5, 8.2],
        workStress: [3.5, 4.8, 2.2, 6.9, 4.1, 5.5, 4.3]
      }
    };

    return fallbackData;
  }
};

/**
 * Clear wellness data cache
 */
export const clearWellnessCache = () => {
  wellnessCache = null;
  console.log('Wellness cache cleared');
};

// Clear cache on import to ensure fresh data
clearWellnessCache();
