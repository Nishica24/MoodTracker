import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Users, MessageCircle, Heart, FileText } from 'lucide-react-native';
import { getHistoricalSocialScores } from '../scoreFunctions/socialScore';
import { generateMoodReport, createMockMoodData } from '../services/reportService';
import { generateAndShowReport } from '../utils/reportUtils';

interface SocialHealthChartProps {
  period: string;
}

export function SocialHealthChart({ period }: SocialHealthChartProps) {
  const [socialData, setSocialData] = useState<number[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [average, setAverage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const historicalScores = await getHistoricalSocialScores(period);
        
        if (historicalScores.length === 0) {

          console.log('historical Score is 0, so using default')
          // Fallback to static data if no historical data
          const fallbackData = [7.2, 8.1, 6.8, 9.2, 8.5, 7.9, 8.8];
          const fallbackDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          setSocialData(fallbackData);
          setDays(fallbackDays);
          setAverage(8.1);
        } else {
          // Use real data
          const scores = historicalScores.map(item => item.score);
          const dates = historicalScores.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
          });
          
          setSocialData(scores);
          setDays(dates);
          
          // Calculate average
          const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          setAverage(parseFloat(avg.toFixed(1)));
        }
      } catch (error) {
        console.error('Error fetching social health data:', error);
        // Fallback to static data on error
        const fallbackData = [7.2, 8.1, 6.8, 9.2, 8.5, 7.9, 8.8];
        const fallbackDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        setSocialData(fallbackData);
        setDays(fallbackDays);
        setAverage(8.1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);
  
  const maxValue = socialData.length > 0 ? Math.max(...socialData) : 10;
  const chartHeight = 120;

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await generateAndShowReport(
        async () => {
          // Create mood data from current social scores
          const moodData = createMockMoodData(socialData);
          
          // Generate the report
          const report = await generateMoodReport(moodData);
          
          // Check if report has an error
          if ((report as any).error) {
            throw new Error(`Server error: ${(report as any).error}`);
          }
          
          return report;
        },
        {
          title: '📊 Social Health Report',
          subtitle: 'Track your social wellness journey',
          averageScore: average,
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Users size={20} color="#EF4444" />
            <Text style={styles.title}>Social Interaction Patterns</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading your social health data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Users size={20} color="#EF4444" />
          <Text style={styles.title}>Social Interaction Patterns</Text>
        </View>
        <Text style={styles.average}>Avg: {average}</Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {socialData.length > 0 ? socialData.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <Text style={styles.scoreLabel}>{value.toFixed(1)}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: (value / maxValue) * chartHeight,
                    backgroundColor: value > 8 ? '#10B981' : value > 6 ? '#F59E0B' : '#EF4444'
                  }
                ]}
              />
              <Text style={styles.dayLabel}>{days[index]}</Text>
            </View>
          )) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No data available for this period</Text>
            </View>
          )}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Excellent (8-10)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Good (6-8)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Needs Improvement (1-6)</Text>
          </View>
        </View>

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

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingHorizontal: 0,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingHorizontal: 0,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: 16,
    borderRadius: 8,
    minHeight: 20,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
