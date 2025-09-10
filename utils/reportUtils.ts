import { router } from 'expo-router';

export interface ReportData {
  weekly_insights: string[];
  improvement_suggestions: string[];
}

export interface ReportParams {
  title: string;
  subtitle?: string;
  averageScore: number;
  period: string;
  reportData: ReportData;
}

/**
 * Navigate to the report screen with the provided data
 * This utility function can be reused across different components
 */
export const navigateToReport = (params: ReportParams) => {
  router.push({
    pathname: '/report',
    params: {
      title: params.title,
      subtitle: params.subtitle || '',
      averageScore: params.averageScore.toString(),
      period: params.period,
      reportData: JSON.stringify(params.reportData),
    },
  });
};

/**
 * Generate a report and navigate to the report screen
 * This is a higher-level utility that handles the entire flow
 */
export const generateAndShowReport = async (
  generateReportFn: () => Promise<ReportData>,
  params: Omit<ReportParams, 'reportData'>
) => {
  try {
    const reportData = await generateReportFn();
    
    // Check if report has the expected structure
    if (!reportData || !reportData.weekly_insights || !reportData.improvement_suggestions) {
      throw new Error('Invalid report format received');
    }
    
    navigateToReport({
      ...params,
      reportData,
    });
    
    return true;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};
