import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { ScreenTimeChart } from '@/components/ScreenTimeChart';
import { TrendCard } from '@/components/TrendCard';
import { SuggestionsBox } from '@/components/SuggestionsBox';
import { ArrowLeft, Smartphone, TrendingDown, TrendingUp, Calendar, Monitor } from 'lucide-react-native';
import { router } from 'expo-router';

export default function ScreenTimeScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const periods = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: '3 Months' },
  ];

  const screenTimeTrends: Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    description: string;
  }> = [
    {
      title: 'Digital Wellness',
      value: '+15%',
      trend: 'up',
      description: 'Better screen time management'
    },
    {
      title: 'Productive Usage',
      value: '+12%',
      trend: 'up',
      description: 'More purposeful screen time'
    },
    {
      title: 'Social Media Time',
      value: '-18%',
      trend: 'down',
      description: 'Reduced passive scrolling'
    },
    {
      title: 'Break Frequency',
      value: '+20%',
      trend: 'up',
      description: 'More regular screen breaks'
    },
  ];

  const weeklyInsights = [
    "Your screen time has decreased by 15% this week, showing improved digital wellness habits.",
    "Saturday had the highest screen time at 7.2 hours, likely due to weekend entertainment.",
    "You've been taking more regular breaks from screens, which has improved focus and productivity.",
    "Consider setting specific time limits for different apps to further optimize your digital usage."
  ];

  const suggestions = [
    {
      id: '1',
      title: 'Set App Limits',
      description: 'Use built-in screen time features to set daily limits for social media and entertainment apps',
      category: 'activities' as const,
    },
    {
      id: '2',
      title: 'Schedule Screen-Free Time',
      description: 'Designate specific hours each day for screen-free activities like reading or exercise',
      category: 'communication' as const,
    },
    {
      id: '3',
      title: 'Use Grayscale Mode',
      description: 'Switch to grayscale mode to make screens less engaging and reduce usage time',
      category: 'social' as const,
    },
    {
      id: '4',
      title: 'Practice Mindful Usage',
      description: 'Before opening an app, ask yourself if it serves a specific purpose or just fills time',
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
            <Text style={styles.title}>Screen Time</Text>
            <Text style={styles.subtitle}>Track your digital wellness journey</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.periodButtonSelected
                ]}
                onPress={() => setSelectedPeriod(period.key)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextSelected
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Screen Time Chart */}
          <ScreenTimeChart period={selectedPeriod} />

          {/* Key Trends */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Trends</Text>
            <View style={styles.trendsContainer}>
              {screenTimeTrends.map((trend, index) => (
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonSelected: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextSelected: {
    color: '#1F2937',
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
