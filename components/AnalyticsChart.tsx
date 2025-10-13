import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { BarChart3, FileText } from 'lucide-react-native';
import { getWellnessData, WellnessChartData } from '../services/wellnessService';
import { generateMoodReport, createMockMoodData } from '../services/reportService';
import { generateAndShowReport } from '../utils/reportUtils';

interface AnalyticsChartProps {
  period: string;
}

export function AnalyticsChart({ period }: AnalyticsChartProps) {
  const [chartData, setChartData] = useState<WellnessChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getWellnessData(period);
        setChartData(data);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [period]);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await generateAndShowReport(
        async () => {
          if (!chartData) {
            throw new Error('No chart data available');
          }
          
          // Create mood data from current wellness scores
          const moodData = createMockMoodData(chartData.data);
          
          // Generate the report
          const report = await generateMoodReport(moodData);
          
          // Check if report has an error
          if ((report as any).error) {
            throw new Error(`Server error: ${(report as any).error}`);
          }
          
          return report;
        },
        {
          title: '📊 Overall Wellness Report',
          subtitle: 'Comprehensive mood and wellness analysis',
          averageScore: chartData?.average || 0,
          period: period,
        }
      );
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const maxValue = chartData && chartData.data.length > 0 ? Math.max(...chartData.data) : 10;
  const chartHeight = 120;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading wellness data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setIsLoading(true);
          setError(null);
          // Re-fetch data
          getWellnessData(period).then(setChartData).catch(setError).finally(() => setIsLoading(false));
        }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <BarChart3 size={20} color="#6366F1" />
          <Text style={styles.title}>Daily Wellness Score</Text>
        </View>
        <Text style={styles.average}>Avg: {chartData?.average?.toFixed(1) ?? 'N/A'}</Text>
      </View>

      <View style={styles.chartContainer}>
        {chartData && chartData.data.length > 0 ? (
          <View style={styles.chart}>
            {chartData.data.map((value, index) => (
              <View key={index} style={styles.barContainer}>
                <Text style={styles.valueLabel}>{value.toFixed(1)}</Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: value > 0 ? (value / maxValue) * chartHeight : 2,
                      backgroundColor: value > 7 ? '#10B981' : value > 5 ? '#F59E0B' : '#EF4444'
                    }
                  ]}
                />
                <Text style={styles.dayLabel}>{chartData.labels[index]}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.chart, styles.centerContent]}>
            <Text style={styles.dayLabel}>No wellness data available for this period.</Text>
          </View>
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Excellent (7-10)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Good (5-7)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Needs Attention (1-5)</Text>
          </View>
        </View>

        {/* Generate Report Button */}
        <TouchableOpacity 
          style={styles.generateReportButton} 
          onPress={handleGenerateReport}
          disabled={generatingReport}
        >
          <FileText size={16} color="white" />
          <Text style={styles.generateReportButtonText}>
            {generatingReport ? 'Generating...' : 'Generate Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Using StyleSheet.create as is standard for React Native
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 26,
    gap: 16,
    minHeight: 320,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  average: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  chartContainer: {
    gap: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingHorizontal: 8,
    paddingTop: 24, // reserve space for value labels
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  valueLabel: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  bar: {
    width: 16,
    borderRadius: 8,
    minHeight: 20,
  },
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  generateReportButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  generateReportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

