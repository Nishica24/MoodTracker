import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { WorkStressChart } from '../components/WorkStressChart';
import { TrendCard } from '../components/TrendCard';
import { SuggestionsBox } from '../components/SuggestionsBox';
import { ArrowLeft, Zap, TrendingDown, TrendingUp, Calendar, Brain } from 'lucide-react-native';
import { router } from 'expo-router';

export default function WorkStressScreen() {

  const workStressTrends: Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    description: string;
  }> = [
    {
      title: 'Stress Management',
      value: '+18%',
      trend: 'up',
      description: 'Better coping mechanisms'
    },
    {
      title: 'Work-Life Balance',
      value: '+12%',
      trend: 'up',
      description: 'Improved boundaries'
    },
    {
      title: 'Task Overload',
      value: '-8%',
      trend: 'down',
      description: 'Reduced workload pressure'
    },
    {
      title: 'Break Time Usage',
      value: '+15%',
      trend: 'up',
      description: 'More regular breaks taken'
    },
  ];

  const weeklyInsights = [
    "Your work stress has decreased by 8% this week, showing improved stress management.",
    "Friday had the highest stress level at 8.2/10, likely due to end-of-week deadlines.",
    "You've been taking more regular breaks, which has helped reduce overall stress levels.",
    "Consider implementing stress-reduction techniques during high-pressure periods."
  ];

  const suggestions = [
    {
      id: '1',
      title: 'Practice Deep Breathing',
      description: 'Take 5-minute breathing breaks every 2 hours to reduce stress and improve focus',
      category: 'activities' as const,
    },
    {
      id: '2',
      title: 'Set Work Boundaries',
      description: 'Establish clear start/end times and avoid checking work emails outside hours',
      category: 'communication' as const,
    },
    {
      id: '3',
      title: 'Take Regular Breaks',
      description: 'Schedule 15-minute breaks every 90 minutes to prevent burnout and maintain productivity',
      category: 'social' as const,
    },
    {
      id: '4',
      title: 'Prioritize Tasks',
      description: 'Use the Eisenhower Matrix to focus on important tasks and delegate when possible',
      category: 'activities' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Work Stress</Text>
            <Text style={styles.subtitle}>Track your workplace wellness journey</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Weekly Chart Section */}
          <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>Weekly Graph</Text>
          </View>
          
          {/* Work Stress Chart */}
          <WorkStressChart period="week" />

          {/* Key Trends */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Trends</Text>
            <View style={styles.trendsContainer}>
              {workStressTrends.map((trend, index) => (
                <TrendCard key={index} {...trend} />
              ))}
            </View>
          </View>

          {/* Weekly Insights */}
          <View style={styles.insightsCard}>
            <Calendar size={24} color="#6366F1" />
            <Text style={styles.insightsTitle}>Weekly Insights</Text>
            <View style={styles.insightsList}>
              {weeklyInsights.map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Suggestions Box */}
          <SuggestionsBox suggestions={suggestions} />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  backButton: {
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
  headerContent: {
    flex: 1,
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
    gap: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  insightsList: {
    width: '100%',
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
    marginTop: 6,
  },
  insightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
  },
});
