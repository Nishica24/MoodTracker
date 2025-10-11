import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { ScreenTimeModule } = NativeModules;

// Simple logger helper to keep messages consistent
const log = (...args: any[]) => console.log('[ScreenTimeService]', ...args);
const warn = (...args: any[]) => console.warn('[ScreenTimeService]', ...args);
const error = (...args: any[]) => console.error('[ScreenTimeService]', ...args);

// Cache for screen time data to prevent excessive API calls
let screenTimeCache: { data: ScreenTimeData[]; timestamp: number } | null = null;
let appUsageCache: { data: AppUsageData[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Check if the native module is available
const isScreenTimeModuleAvailable = () => {
  const available = ScreenTimeModule && typeof ScreenTimeModule.checkPermission === 'function';
  log('Native module availability check:', { available: !!available, platform: Platform.OS });
  return available;
};

export interface ScreenTimeData {
  date: string;
  screenTimeHours: number;
  screenTimeMs: number;
}

export interface AppUsageData {
  packageName: string;
  usageHours: number;
  usageMs: number;
}

const requestPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    log('requestPermission called on non-Android platform; no permission needed.');
    return true; // iOS doesn't need this permission
  }

  try {
    // Check if permission is already granted
    log('Requesting permission: checking current status...');
    const hasPermission = await ScreenTimeModule.checkPermission();
    log('Current permission status:', { hasPermission });
    if (hasPermission) {
      log('Permission already granted; nothing to request.');
      return true;
    }

    // Request permission by opening settings
    log('Permission not granted; invoking ScreenTimeModule.requestPermission (opens settings).');
    await ScreenTimeModule.requestPermission();
    log('Returned from requestPermission invocation; user must grant manually in settings.');
    return false; // User needs to manually grant permission
  } catch (err) {
    warn('Error requesting screen time permission:', err);
    return false;
  }
};

const checkPermission = async (): Promise<boolean> => {
  if (!isScreenTimeModuleAvailable()) {
    return false;
  }

  try {
    log('checkPermission: invoking native check (no inputs).');
    const result = await ScreenTimeModule.checkPermission();
    log('checkPermission: result from native:', { result });
    return result;
  } catch (err) {
    warn('Error checking screen time permission:', err);
    return false;
  }
};

const getScreenTimeData = async (): Promise<ScreenTimeData[]> => {
  if (!isScreenTimeModuleAvailable()) {
    throw new Error('Screen time module is not available. This feature requires native Android implementation.');
  }

  try {
    // Check cache first
    const now = Date.now();
    if (screenTimeCache && (now - screenTimeCache.timestamp) < CACHE_DURATION) {
      log('getScreenTimeData: returning cached data');
      return screenTimeCache.data;
    }

    log('getScreenTimeData: invoking native method (cache miss or expired).');
    const data = await ScreenTimeModule.getScreenTimeData();
    log('getScreenTimeData: output summary:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : undefined,
      sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });

    // Cache the result
    screenTimeCache = { data, timestamp: now };
    
    return data;
  } catch (err) {
    error('Error getting screen time data:', err);
    throw err;
  }
};

const getAppUsageData = async (): Promise<AppUsageData[]> => {
  if (!isScreenTimeModuleAvailable()) {
    throw new Error('Screen time module is not available. This feature requires native Android implementation.');
  }

  try {
    // Check cache first
    const now = Date.now();
    if (appUsageCache && (now - appUsageCache.timestamp) < CACHE_DURATION) {
      log('getAppUsageData: returning cached data');
      return appUsageCache.data;
    }

    log('getAppUsageData: invoking native method (cache miss or expired).');
    const data = await ScreenTimeModule.getAppUsageData();
    log('getAppUsageData: output summary:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : undefined,
      top: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });

    // Cache the result
    appUsageCache = { data, timestamp: now };
    
    return data;
  } catch (err) {
    error('Error getting app usage data:', err);
    throw err;
  }
};

// Calculate screen time trends
const calculateScreenTimeTrends = (screenTimeData: ScreenTimeData[]) => {
  if (screenTimeData.length < 2) {
    return {
      average: 0,
      trend: 'stable' as const,
      change: 0,
      total: 0
    };
  }

  const total = screenTimeData.reduce((sum, day) => sum + day.screenTimeHours, 0);
  const average = total / screenTimeData.length;
  
  // Compare last 3 days with previous 3 days
  const recentDays = screenTimeData.slice(-3);
  const previousDays = screenTimeData.slice(-6, -3);
  
  const recentAverage = recentDays.reduce((sum, day) => sum + day.screenTimeHours, 0) / recentDays.length;
  const previousAverage = previousDays.length > 0 
    ? previousDays.reduce((sum, day) => sum + day.screenTimeHours, 0) / previousDays.length 
    : recentAverage;
  
  const change = previousAverage > 0 ? ((recentAverage - previousAverage) / previousAverage) * 100 : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (change > 5) trend = 'up';
  else if (change < -5) trend = 'down';

  return {
    average: Math.round(average * 10) / 10,
    trend,
    change: Math.round(change * 10) / 10,
    total: Math.round(total * 10) / 10
  };
};

// Generate insights based on screen time data
const generateInsights = (screenTimeData: ScreenTimeData[], appUsageData: AppUsageData[]) => {
  const insights = [];
  const trends = calculateScreenTimeTrends(screenTimeData);
  
  // Average screen time insight
  if (trends.average < 4) {
    insights.push("Great job! Your screen time is well within healthy limits.");
  } else if (trends.average < 6) {
    insights.push("Your screen time is moderate. Consider taking more breaks to maintain digital wellness.");
  } else {
    insights.push("Your screen time is quite high. Try setting daily limits for different apps.");
  }

  // Trend insight
  if (trends.trend === 'down' && trends.change < -10) {
    insights.push(`Excellent! You've reduced your screen time by ${Math.abs(trends.change)}% recently.`);
  } else if (trends.trend === 'up' && trends.change > 10) {
    insights.push(`Your screen time has increased by ${trends.change}%. Consider setting some boundaries.`);
  }

  // App usage insight
  if (appUsageData.length > 0) {
    const topApp = appUsageData[0];
    if (topApp.usageHours > 2) {
      insights.push(`${topApp.packageName} is your most used app with ${topApp.usageHours.toFixed(1)} hours today.`);
    }
  }

  // Weekend vs weekday insight
  const weekendData = screenTimeData.filter((_, index) => index >= 5); // Saturday and Sunday
  const weekdayData = screenTimeData.filter((_, index) => index < 5); // Monday to Friday
  
  if (weekendData.length > 0 && weekdayData.length > 0) {
    const weekendAverage = weekendData.reduce((sum, day) => sum + day.screenTimeHours, 0) / weekendData.length;
    const weekdayAverage = weekdayData.reduce((sum, day) => sum + day.screenTimeHours, 0) / weekdayData.length;
    
    if (weekendAverage > weekdayAverage * 1.5) {
      insights.push("You tend to use your phone more on weekends. Consider planning some screen-free activities.");
    }
  }

  return insights;
};

export const ScreenTimeService = {
  requestPermission,
  checkPermission,
  getScreenTimeData,
  getAppUsageData,
  calculateScreenTimeTrends,
  generateInsights,
  isAvailable: isScreenTimeModuleAvailable,
  clearCache: () => {
    screenTimeCache = null;
    appUsageCache = null;
    log('Screen time cache cleared');
  },
};
