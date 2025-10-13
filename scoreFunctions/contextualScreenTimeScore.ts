import { analyzeAppUsagePatterns, AppCategory } from '../utils/appCategorization';
import { UserProfile, getTimeContext } from '../utils/userProfile';

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

/**
 * Calculates contextual screen time score based on app usage patterns and user profile
 * @param screenTimeData - Daily screen time data
 * @param appUsageData - App usage breakdown
 * @param userProfile - User profile for contextual scoring
 * @returns Contextual screen time score (0-10)
 */
export const calculateContextualScreenTimeScore = (
  screenTimeData: ScreenTimeData[],
  appUsageData: AppUsageData[],
  userProfile: UserProfile
): number => {
  try {
    // Get today's data
    const today = new Date().toISOString().split('T')[0];
    const todayData = screenTimeData.find(d => d.date === today);
    
    if (!todayData) {
      return 5.0; // Neutral score if no data
    }

    const totalHours = todayData.screenTimeHours;
    const timeContext = getTimeContext(userProfile);
    
    // Convert app usage data to the format expected by analysis functions
    const appUsageForAnalysis = appUsageData.map(app => ({
      packageName: app.packageName,
      usageMs: app.usageMs
    }));

    // Analyze app usage patterns
    type UsageAnalysis = {
      totalHours: number;
      categoryBreakdown: Array<{ category: AppCategory; ratio: number; hours: number }>;
      topCategories: Array<{ category: AppCategory; ratio: number; hours: number }>;
      isProductive: boolean;
      isEducational: boolean;
      isEntertainmentHeavy: boolean;
      isWorkFocused: boolean;
    };
    const usageAnalysis: UsageAnalysis = analyzeAppUsagePatterns(appUsageForAnalysis) as UsageAnalysis;
    
    // Start with base score
    let score = 5.0;

    // Factor 1: Total Screen Time Impact (base penalty for excessive usage)
    if (totalHours > 8) {
      score -= 2.0; // Heavy penalty for excessive usage
    } else if (totalHours > 6) {
      score -= 1.0; // Moderate penalty
    } else if (totalHours < 2) {
      score -= 0.5; // Slight penalty for very low usage (might indicate avoidance)
    }

    // Factor 2: App Category Analysis based on user role and time context
    score += calculateAppCategoryScore(usageAnalysis, userProfile, timeContext);

    // Factor 3: Time Context Adjustments
    score += calculateTimeContextScore(usageAnalysis, timeContext, userProfile);

    // Factor 4: Digital Overload Detection
    score += calculateDigitalOverloadPenalty(usageAnalysis, totalHours, userProfile);

    // Factor 5: Work-Life Balance (for working adults and professionals)
    if (userProfile.role === 'working_adult' || userProfile.role === 'professional') {
      score += calculateWorkLifeBalanceScore(usageAnalysis, timeContext);
    }

    // Factor 6: Study Efficiency (for students)
    if (userProfile.role === 'student') {
      score += calculateStudyEfficiencyScore(usageAnalysis, timeContext);
    }

    return Math.max(0, Math.min(10, score));

  } catch (error) {
    console.error('Error calculating contextual screen time score:', error);
    return 5.0; // Return neutral score on error
  }
};

/**
 * Calculates score based on app category usage
 */
const calculateAppCategoryScore = (
  usageAnalysis: any,
  userProfile: UserProfile,
  timeContext: 'work' | 'leisure' | 'study'
): number => {
  let score = 0;

  // Productivity apps - generally positive
  const productivityRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'PRODUCTIVITY')?.ratio || 0;
  score += productivityRatio * 2.0;

  // Education apps - positive for students, neutral for others
  const educationRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'EDUCATION')?.ratio || 0;
  if (userProfile.role === 'student') {
    score += educationRatio * 2.5; // High bonus for students
  } else {
    score += educationRatio * 1.0; // Moderate bonus for others
  }

  // Work communication apps - positive during work hours
  const workCommRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'WORK_COMMUNICATION')?.ratio || 0;
  if (timeContext === 'work') {
    score += workCommRatio * 1.5; // Bonus during work hours
  } else {
    score += workCommRatio * 0.5; // Neutral during leisure
  }

  // Entertainment apps - context dependent
  const entertainmentRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'ENTERTAINMENT')?.ratio || 0;
  if (timeContext === 'work' || timeContext === 'study') {
    score -= entertainmentRatio * 2.0; // Heavy penalty during work/study
  } else {
    score -= entertainmentRatio * 0.5; // Light penalty during leisure
  }

  // Social apps - moderate impact
  const socialRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'SOCIAL')?.ratio || 0;
  if (socialRatio > 0.3) {
    score -= 0.5; // Slight penalty for excessive social media
  }

  // Health & Wellness apps - positive impact
  const healthRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'HEALTH_WELLNESS')?.ratio || 0;
  score += healthRatio * 1.5; // Bonus for health apps

  // News & Information apps - moderate positive
  const newsRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'NEWS_INFORMATION')?.ratio || 0;
  score += newsRatio * 0.8; // Moderate bonus for news/info

  // Finance apps - neutral to positive
  const financeRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'FINANCE')?.ratio || 0;
  score += financeRatio * 0.5; // Small bonus for financial management

  return score;
};

/**
 * Calculates score based on time context
 */
const calculateTimeContextScore = (
  usageAnalysis: any,
  timeContext: 'work' | 'leisure' | 'study',
  userProfile: UserProfile
): number => {
  let score = 0;

  if (timeContext === 'work') {
    // During work hours, productivity and work apps are good
    if (usageAnalysis.isProductive) score += 1.0;
    if (usageAnalysis.isWorkFocused) score += 0.5;
    if (usageAnalysis.isEntertainmentHeavy) score -= 1.5;
  } else if (timeContext === 'study') {
    // During study hours, education and productivity apps are good
    if (usageAnalysis.isEducational) score += 1.5;
    if (usageAnalysis.isProductive) score += 0.5;
    if (usageAnalysis.isEntertainmentHeavy) score -= 2.0;
  } else {
    // During leisure, moderate entertainment is okay
    if (usageAnalysis.isEntertainmentHeavy) score -= 0.5;
    if (usageAnalysis.isProductive) score += 0.3; // Still good to be productive
  }

  return score;
};

/**
 * Calculates digital overload penalty
 */
const calculateDigitalOverloadPenalty = (
  usageAnalysis: any,
  totalHours: number,
  userProfile: UserProfile
): number => {
  let penalty = 0;

  // High total usage penalty
  if (totalHours > 10) {
    penalty -= 2.0;
  } else if (totalHours > 8) {
    penalty -= 1.0;
  }

  // Excessive entertainment penalty
  if (usageAnalysis.isEntertainmentHeavy && totalHours > 6) {
    penalty -= 1.0;
  }

  // Work-life balance penalty for working adults
  if ((userProfile.role === 'working_adult' || userProfile.role === 'professional') && 
      usageAnalysis.isWorkFocused && totalHours > 8) {
    penalty -= 0.5; // Working too much
  }

  return penalty;
};

/**
 * Calculates work-life balance score
 */
const calculateWorkLifeBalanceScore = (
  usageAnalysis: any,
  timeContext: 'work' | 'leisure' | 'study'
): number => {
  let score = 0;

  // Good work-life balance indicators
  if (timeContext === 'leisure' && !usageAnalysis.isWorkFocused) {
    score += 0.5; // Not working during leisure time
  }

  if (timeContext === 'work' && usageAnalysis.isProductive) {
    score += 0.3; // Being productive during work time
  }

  return score;
};

/**
 * Calculates study efficiency score for students
 */
const calculateStudyEfficiencyScore = (
  usageAnalysis: any,
  timeContext: 'work' | 'leisure' | 'study'
): number => {
  let score = 0;

  if (timeContext === 'study') {
    if (usageAnalysis.isEducational) score += 1.0;
    if (usageAnalysis.isProductive) score += 0.5;
    if (usageAnalysis.isEntertainmentHeavy) score -= 1.5;
  }

  return score;
};

/**
 * Gets contextual insights about screen time usage
 */
export const getScreenTimeInsights = (
  screenTimeData: ScreenTimeData[],
  appUsageData: AppUsageData[],
  userProfile: UserProfile
): string[] => {
  const insights: string[] = [];
  
  const today = new Date().toISOString().split('T')[0];
  const todayData = screenTimeData.find(d => d.date === today);
  
  if (!todayData) return insights;

  const appUsageForAnalysis = appUsageData.map(app => ({
    packageName: app.packageName,
    usageMs: app.usageMs
  }));

  const usageAnalysis = analyzeAppUsagePatterns(appUsageForAnalysis);
  const timeContext = getTimeContext(userProfile);

  // Total usage insights
  if (todayData.screenTimeHours > 8) {
    insights.push("High screen time detected. Consider taking breaks.");
  } else if (todayData.screenTimeHours < 3) {
    insights.push("Low screen time today. Great job!");
  }

  // App category insights
  if (usageAnalysis.isEntertainmentHeavy && timeContext === 'work') {
    insights.push("High entertainment usage during work hours. Stay focused!");
  }

  if (usageAnalysis.isEducational && userProfile.role === 'student') {
    insights.push("Great use of educational apps! Keep learning.");
  }

  if (usageAnalysis.isProductive) {
    insights.push("Good productivity app usage. You're being efficient!");
  }

  // Work-life balance insights
  if (userProfile.role === 'working_adult' && usageAnalysis.isWorkFocused && timeContext === 'leisure') {
    insights.push("Consider disconnecting from work during leisure time.");
  }

  // Health & wellness insights
  const healthRatio = usageAnalysis.categoryBreakdown.find((c: { category: AppCategory; ratio: number; hours: number }) => c.category === 'HEALTH_WELLNESS')?.ratio || 0;
  if (healthRatio > 0.1) {
    insights.push("Great job using health & wellness apps!");
  }

  return insights;
};
