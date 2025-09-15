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

interface ReportData {
  weekly_insights: string[];
  improvement_suggestions: string[];
  error?: string;
  raw?: string;
}

const BACKEND_URL = 'http://locahost:5000'; // Updated to use development machine's IP address

export async function generateMoodReport(moodData: MoodData): Promise<ReportData> {
  try {
    const response = await fetch(`http://192.168.56.1:5000/generate-mood-report`, {
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
