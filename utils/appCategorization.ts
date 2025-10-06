/**
 * App Categorization System
 * Categorizes apps based on their purpose and user context
 */

export const APP_CATEGORIES = {
  PRODUCTIVITY: [
    'com.microsoft.office',
    'com.google.android.apps.docs',
    'com.google.android.apps.sheets',
    'com.google.android.apps.slides',
    'com.adobe.reader',
    'com.notion.id',
    'com.evernote',
    'com.todoist',
    'com.trello',
    'com.asana'
  ],
  EDUCATION: [
    'com.google.android.apps.classroom',
    'com.khanacademy',
    'edu.stanford',
    'com.coursera',
    'com.udemy',
    'com.edx',
    'com.duolingo',
    'com.babbel',
    'com.quizlet',
    'com.cambridge'
  ],
  WORK_COMMUNICATION: [
    'com.microsoft.teams',
    'com.zoom',
    'com.skype',
    'com.slack',
    'com.discord',
    'com.telegram',
    'com.signal',
    'com.whatsapp.business',
    'com.google.android.apps.meet'
  ],
  ENTERTAINMENT: [
    'com.netflix',
    'com.spotify',
    'com.youtube',
    'com.disney',
    'com.hulu',
    'com.twitch',
    'com.tiktok',
    'com.instagram',
    'com.snapchat',
    'com.pinterest',
    'com.reddit',
    'com.tumblr'
  ],
  SOCIAL: [
    'com.whatsapp',
    'com.facebook',
    'com.twitter',
    'com.linkedin',
    'com.instagram',
    'com.snapchat',
    'com.tiktok',
    'com.pinterest',
    'com.reddit'
  ],
  HEALTH_WELLNESS: [
    'com.myfitnesspal',
    'com.headspace',
    'com.calm',
    'com.strava',
    'com.fitbit',
    'com.nike.trainingclub',
    'com.meditation',
    'com.sleepcycle',
    'com.insighttimer'
  ],
  NEWS_INFORMATION: [
    'com.google.android.apps.news',
    'com.bbc.news',
    'com.cnn.mobile',
    'com.nytimes.android',
    'com.washingtonpost.rainbow',
    'com.reddit.frontpage',
    'com.medium.reader'
  ],
  FINANCE: [
    'com.paypal',
    'com.venmo',
    'com.cashapp',
    'com.robinhood',
    'com.etrade',
    'com.fidelity',
    'com.chase',
    'com.bankofamerica'
  ]
};

export type AppCategory = keyof typeof APP_CATEGORIES;

/**
 * Categorizes an app based on its package name
 * @param packageName - The package name of the app
 * @returns The category of the app or 'OTHER' if not found
 */
export const categorizeApp = (packageName: string): AppCategory | 'OTHER' => {
  for (const [category, apps] of Object.entries(APP_CATEGORIES)) {
    if (apps.some(app => packageName.includes(app))) {
      return category as AppCategory;
    }
  }
  return 'OTHER';
};

/**
 * Gets the ratio of usage for a specific app category
 * @param appUsageData - Array of app usage data
 * @param category - The category to check
 * @returns The ratio (0-1) of total usage time for this category
 */
export const getAppCategoryRatio = (
  appUsageData: Array<{ packageName: string; usageMs: number }>,
  category: AppCategory
): number => {
  const totalUsage = appUsageData.reduce((sum, app) => sum + app.usageMs, 0);
  if (totalUsage === 0) return 0;

  const categoryUsage = appUsageData
    .filter(app => categorizeApp(app.packageName) === category)
    .reduce((sum, app) => sum + app.usageMs, 0);

  return categoryUsage / totalUsage;
};

/**
 * Gets the total usage time for a specific app category in hours
 * @param appUsageData - Array of app usage data
 * @param category - The category to check
 * @returns The total usage time in hours for this category
 */
export const getAppCategoryUsageHours = (
  appUsageData: Array<{ packageName: string; usageMs: number }>,
  category: AppCategory
): number => {
  const categoryUsage = appUsageData
    .filter(app => categorizeApp(app.packageName) === category)
    .reduce((sum, app) => sum + app.usageMs, 0);

  return categoryUsage / (1000 * 60 * 60); // Convert ms to hours
};

/**
 * Analyzes app usage patterns for contextual insights
 * @param appUsageData - Array of app usage data
 * @returns Object containing usage analysis
 */
export const analyzeAppUsagePatterns = (
  appUsageData: Array<{ packageName: string; usageMs: number }>
) => {
  const totalUsage = appUsageData.reduce((sum, app) => sum + app.usageMs, 0);
  const totalHours = totalUsage / (1000 * 60 * 60);

  const categoryBreakdown = Object.keys(APP_CATEGORIES).map(category => ({
    category: category as AppCategory,
    ratio: getAppCategoryRatio(appUsageData, category as AppCategory),
    hours: getAppCategoryUsageHours(appUsageData, category as AppCategory)
  }));

  const topCategories = categoryBreakdown
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3);

  return {
    totalHours,
    categoryBreakdown,
    topCategories,
    isProductive: getAppCategoryRatio(appUsageData, 'PRODUCTIVITY') > 0.3,
    isEducational: getAppCategoryRatio(appUsageData, 'EDUCATION') > 0.2,
    isEntertainmentHeavy: getAppCategoryRatio(appUsageData, 'ENTERTAINMENT') > 0.4,
    isWorkFocused: getAppCategoryRatio(appUsageData, 'WORK_COMMUNICATION') > 0.2
  };
};
