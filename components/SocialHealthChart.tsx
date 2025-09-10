import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView, Modal, SafeAreaView } from 'react-native';
import { Users, MessageCircle, Heart, FileText, X } from 'lucide-react-native';
import { getHistoricalSocialScores } from '@/scoreFunctions/socialScore';
import { generateMoodReport, createMockMoodData } from '@/services/reportService';

interface SocialHealthChartProps {
  period: string;
}

export function SocialHealthChart({ period }: SocialHealthChartProps) {
  const [socialData, setSocialData] = useState<number[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [average, setAverage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

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
      // Create mood data from current social scores
      const moodData = createMockMoodData(socialData);
      
      // Generate the report
      const report = await generateMoodReport(moodData);
      
      // Check if report has an error
      if ((report as any).error) {
        throw new Error(`Server error: ${(report as any).error}`);
      }
      
      // Check if report has the expected structure
      if (!report || !report.key_trends || !report.weekly_insights || !report.improvement_suggestions) {
        throw new Error('Invalid report format received from server');
      }
      
      // Store the report data and show the modal
      setReportData(report);
      setShowReport(true);
      
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

      {/* Report Modal */}
      <Modal
        visible={showReport}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowReport(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 Social Health Report</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowReport(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
            {reportData && (
              <>
                {/* Summary Section */}
                <View style={styles.reportSectionFirst}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryText}>
                      Average Social Score: <Text style={styles.scoreText}>{average.toFixed(1)}/10</Text>
                    </Text>
                    <Text style={styles.summaryText}>
                      Period: {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                    <Text style={styles.summaryText}>
                      Generated on: {new Date().toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Key Trends Section */}
                <View style={styles.reportSection}>
                  <Text style={styles.sectionTitle}>🔍 Key Trends</Text>
                  <View style={styles.trendsCard}>
                    {reportData.key_trends.map((trend: string, index: number) => (
                      <View key={index} style={styles.listItem}>
                        <View style={[styles.bullet, { backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.listText}>{trend}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Weekly Insights Section */}
                <View style={styles.reportSection}>
                  <Text style={styles.sectionTitle}>💡 Weekly Insights</Text>
                  <View style={styles.insightsCard}>
                    {reportData.weekly_insights.map((insight: string, index: number) => (
                      <View key={index} style={styles.listItem}>
                        <View style={[styles.bullet, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.listText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Improvement Suggestions Section */}
                <View style={styles.reportSection}>
                  <Text style={styles.sectionTitle}>🎯 Improvement Suggestions</Text>
                  <View style={styles.suggestionsCard}>
                    {reportData.improvement_suggestions.map((suggestion: string, index: number) => (
                      <View key={index} style={styles.listItem}>
                        <View style={[styles.bullet, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.listText}>{suggestion}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Test section to ensure scrolling works */}
                <View style={styles.testSection}>
                  <Text style={styles.testText}>End of Report - You can scroll to see this!</Text>
                </View>
              </>
            )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingHorizontal: 8,
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
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
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
  // Modal styles - matching social health page structure
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  // Report section styles
  reportSection: {
    gap: 16,
  },
  reportSectionFirst: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryCard: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  trendsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  testSection: {
    padding: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  testText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    textAlign: 'center',
  },
});
