// reportService.ts

// ========================================================================
// SECTION 1: EXISTING INTERFACES (No changes needed here)
// ========================================================================

interface MoodData {
  mood_patterns: {
    average_mood_score: number;
    mood_fluctuations: string;
  };
  social_health: {
    daily_summaries: Array<{
      date: string;
      outgoingCount: number;
      incomingCount: number;
      missedCount: number;
      rejectedCount: number;
      avgDuration: number;
      uniqueContacts: number;
    }>;
  };
  spending_patterns: {
    spending_score: number;
    spending_trends: string;
  };
  work_stress: {
    work_stress_score: number;
  };
  sleep_pattern: {
    sleep_score: number;
    average_hours: number;
    sleep_tracking_access: boolean;
  };
  screentime_usage: {
    screentime_score: number;
    average_hours: number;
  };
}

// This interface is generic and can be reused for the screen time report
interface ReportData {
  weekly_insights: string[];
  improvement_suggestions: string[];
  error?: string;
  raw?: string;
}

// ========================================================================
// SECTION 2: NEW INTERFACES FOR SCREEN TIME
// These define the data structure for the screen time report.
// ========================================================================

/**
 * @description Represents the data for a single day's screen time.
 */
interface ScreenTimeDailySummary {
  date: string;
  total_hours: number;
}

/**
 * @description Represents the usage data for a single application.
 */
interface AppUsageSummary {
  app_name: string;
  usage_hours: number;
}

/**
 * @description The main data structure sent to the backend for generating a screen time report.
 * This is analogous to the `MoodData` interface.
 */
interface ScreenTimeData {
  daily_screen_time: ScreenTimeDailySummary[];
  app_usage_breakdown: AppUsageSummary[];
}


// ========================================================================
// SECTION 3: EXISTING REPORT GENERATION (No changes needed here)
// ========================================================================

const BACKEND_URL = 'http://localhost:5000'; 

export async function generateMoodReport(moodData: MoodData): Promise<ReportData> {
  try {
    const response = await fetch(`http://localhost:5000/generate-mood-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(moodData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reportData = await response.json();
    return reportData;
  } catch (error) {
    console.error('Error generating mood report:', error);
    throw new Error('Failed to generate report. Please try again.');
  }
}

// ========================================================================
// SECTION 4: NEW SCREEN TIME REPORT GENERATION FUNCTION
// This function sends your screen time data to a new backend endpoint.
// ========================================================================

/**
 * @description Sends screen time data to the backend to generate a report.
 * @param screenTimeData The structured screen time and app usage data.
 * @returns A promise that resolves to the generated report data.
 */
export async function generateScreenTimeReport(screenTimeData: ScreenTimeData): Promise<ReportData> {
  try {
    // Note the new endpoint: /generate-screentime-report
    const response = await fetch(`${BACKEND_URL}/generate-screentime-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(screenTimeData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reportData = await response.json();
    return reportData;
  } catch (error) {
    console.error('Error generating screen time report:', error);
    throw new Error('Failed to generate screen time report. Please try again.');
  }
}

// ========================================================================
// SECTION 5: MOCK DATA GENERATORS
// ========================================================================

// Your existing mock mood data generator (no changes)
export function createMockMoodData(socialScores: number[]): MoodData {
  const averageSocialScore = socialScores.length > 0 
    ? socialScores.reduce((sum, score) => sum + score, 0) / socialScores.length 
    : 7.5;

  // Create daily summaries based on social scores
  const dailySummaries = socialScores.map((score, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (socialScores.length - 1 - index));
    
    // Generate realistic data based on social score
    const baseInteractions = Math.round(score * 1.5);
    const outgoingCount = Math.max(1, Math.round(baseInteractions * 0.6));
    const incomingCount = Math.max(1, Math.round(baseInteractions * 0.4));
    const missedCount = Math.round((10 - score) * 0.3);
    const rejectedCount = Math.round((10 - score) * 0.1);
    const avgDuration = Math.round(score * 2 + 5); // 5-25 minutes based on score
    const uniqueContacts = Math.max(1, Math.round(score * 0.8));

    return {
      date: date.toISOString().split('T')[0],
      outgoingCount,
      incomingCount,
      missedCount,
      rejectedCount,
      avgDuration,
      uniqueContacts,
    };
  });

  return {
    mood_patterns: {
      average_mood_score: averageSocialScore,
      mood_fluctuations: averageSocialScore > 7 ? 'stable' : 'volatile',
    },
    social_health: {
      daily_summaries: dailySummaries,
    },
    spending_patterns: {
      spending_score: 7.2,
      spending_trends: 'stable',
    },
    work_stress: {
      work_stress_score: 6.5,
    },
    sleep_pattern: {
      sleep_score: 7.8,
      average_hours: 7.5,
      sleep_tracking_access: true,
    },
    screentime_usage: {
      screentime_score: 6.0,
      average_hours: 4.2,
    },
  };
}

/**
 * @description A new helper function to transform your raw service data into the required `ScreenTimeData` format.
 * @param rawScreenTime - The output from your `getScreenTimeData` service.
 * @param rawAppUsage - The output from your `getAppUsageData` service.
 * @returns A structured `ScreenTimeData` object ready to be sent to the backend.
 */
export function formatScreenTimeData(
  rawScreenTime: Array<{ date: string; screenTimeMs: number }>,
  rawAppUsage: Array<{ packageName: string; usageMs: number }>
): ScreenTimeData {
  
  // Helper to convert milliseconds to hours
  const msToHours = (ms: number) => ms / (1000 * 60 * 60);

  const daily_screen_time: ScreenTimeDailySummary[] = rawScreenTime.map(item => ({
    date: item.date,
    total_hours: msToHours(item.screenTimeMs),
  }));
  
  const app_usage_breakdown: AppUsageSummary[] = rawAppUsage.map(item => ({
    app_name: item.packageName, // You might want to map package names to real names later
    usage_hours: msToHours(item.usageMs),
  }));

  return {
    daily_screen_time,
    app_usage_breakdown,
  };
}

// ========================================================================
// SECTION 6: WORK STRESS REPORT GENERATION
// ========================================================================

/**
 * @description Represents the data for work stress report generation.
 */
interface WorkStressData {
  daily_stress_scores: Array<{
    date: string;
    stress_score: number;
  }>;
  average_stress_score: number;
  stress_trend: string; // 'increasing', 'decreasing', 'stable'
  high_stress_days: number;
  low_stress_days: number;
}

/**
 * @description Sends work stress data to the backend to generate a report.
 * @param workStressData The structured work stress data.
 * @returns A promise that resolves to the generated report data.
 */
export async function generateWorkStressReport(workStressData: WorkStressData): Promise<ReportData> {
  try {
    const response = await fetch(`${BACKEND_URL}/generate-workstress-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workStressData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reportData = await response.json();
    return reportData;
  } catch (error) {
    console.error('Error generating work stress report:', error);
    throw new Error('Failed to generate work stress report. Please try again.');
  }
}

/**
 * @description Creates mock work stress data from stress scores for report generation.
 * @param stressScores Array of daily stress scores (1-10 scale).
 * @returns A structured WorkStressData object.
 */
export function createMockWorkStressData(stressScores: number[]): WorkStressData {
  const averageStressScore = stressScores.length > 0 
    ? stressScores.reduce((sum, score) => sum + score, 0) / stressScores.length 
    : 5.0;

  // Create daily stress data
  const dailyStressScores = stressScores.map((score, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (stressScores.length - 1 - index));
    
    return {
      date: date.toISOString().split('T')[0],
      stress_score: score,
    };
  });

  // Calculate trend
  let stressTrend = 'stable';
  if (stressScores.length >= 2) {
    const firstHalf = stressScores.slice(0, Math.floor(stressScores.length / 2));
    const secondHalf = stressScores.slice(Math.floor(stressScores.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg + 0.5) {
      stressTrend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg - 0.5) {
      stressTrend = 'decreasing';
    }
  }

  // Count high and low stress days
  const highStressDays = stressScores.filter(score => score > 7).length;
  const lowStressDays = stressScores.filter(score => score < 4).length;

  return {
    daily_stress_scores: dailyStressScores,
    average_stress_score: parseFloat(averageStressScore.toFixed(1)),
    stress_trend: stressTrend,
    high_stress_days: highStressDays,
    low_stress_days: lowStressDays,
  };
}