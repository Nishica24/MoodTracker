import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { AnalyticsChart } from '../../components/AnalyticsChart';
import { TrendCard } from '../../components/TrendCard';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

export default function AnalyticsScreen() {
  const selectedPeriod = 'week';

  const trends: Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    description: string;
  }> = [
    {
      title: 'Mood Stability',
      value: '+12%',
      trend: 'up',
      description: 'More consistent mood patterns'
    },
    {
      title: 'Sleep Quality',
      value: '+8%',
      trend: 'up',
      description: 'Better sleep duration and quality'
    },
    {
      title: 'Work Stress',
      value: '-15%',
      trend: 'down',
      description: 'Reduced stress levels'
    },
    {
      title: 'Social Engagement',
      value: '0%',
      trend: 'stable',
      description: 'Maintaining social connections'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Track your wellness journey</Text>
        </View>

        <View style={styles.content}>
          {/* Weekly Chart Section */}
          <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>Weekly Graph</Text>
          </View>
          
          {/* Analytics Chart */}
          <AnalyticsChart period={selectedPeriod} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Trends</Text>
            <View style={styles.trendsContainer}>
              {trends.map((trend, index) => (
                <TrendCard key={index} {...trend} />
              ))}
            </View>
          </View>

          <View style={styles.insightsCard}>
            <Calendar size={24} color="#6366F1" />
            <Text style={styles.insightsTitle}>Weekly Insights</Text>
            <Text style={styles.insightsText}>
              Your mood has been more stable this week. Consider maintaining your current 
              sleep schedule and social activities to continue this positive trend.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  chartSection: {
    marginBottom: -8,
    alignItems: 'center',
  },
  chartSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  trendsContainer: {
    gap: 12,
  },
  insightsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  insightsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});