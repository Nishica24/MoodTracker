import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { SpendingWellnessChart } from '@/components/SpendingWellnessChart';
import { TrendCard } from '@/components/TrendCard';
import { SuggestionsBox } from '@/components/SuggestionsBox';
import { ArrowLeft, DollarSign, TrendingDown, TrendingUp, Calendar, PiggyBank } from 'lucide-react-native';
import { router } from 'expo-router';

export default function SpendingWellnessScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const periods = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: '3 Months' },
  ];

  const spendingTrends: Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    description: string;
  }> = [
    {
      title: 'Budget Adherence',
      value: '+12%',
      trend: 'up',
      description: 'Better staying within budget limits'
    },
    {
      title: 'Savings Rate',
      value: '+8%',
      trend: 'up',
      description: 'Increased monthly savings'
    },
    {
      title: 'Impulse Spending',
      value: '-15%',
      trend: 'down',
      description: 'Reduced unplanned purchases'
    },
    {
      title: 'Essential Expenses',
      value: '+5%',
      trend: 'up',
      description: 'Better prioritization of needs'
    },
  ];

  const weeklyInsights = [
    "Your spending this week was 78% of your budget, showing good financial discipline.",
    "Wednesday had the highest spending at 92% of budget, mainly due to grocery shopping.",
    "You've reduced impulse purchases by 15% compared to last week.",
    "Consider setting aside more funds for weekend activities to avoid overspending."
  ];

  const suggestions = [
    {
      id: '1',
      title: 'Create a Budget Plan',
      description: 'Set weekly spending limits for different categories like food, entertainment, and shopping',
      category: 'activities' as const,
    },
    {
      id: '2',
      title: 'Track Daily Expenses',
      description: 'Use a spending tracker app to monitor where your money goes each day',
      category: 'communication' as const,
    },
    {
      id: '3',
      title: 'Set Savings Goals',
      description: 'Establish monthly savings targets and automate transfers to savings account',
      category: 'social' as const,
    },
    {
      id: '4',
      title: 'Review Subscriptions',
      description: 'Audit monthly subscriptions and cancel unused services to reduce expenses',
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
            <Text style={styles.title}>Spending Wellness</Text>
            <Text style={styles.subtitle}>Track your financial wellness journey</Text>
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

          {/* Spending Wellness Chart */}
          <SpendingWellnessChart period={selectedPeriod} />

          {/* Key Trends */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Trends</Text>
            <View style={styles.trendsContainer}>
              {spendingTrends.map((trend, index) => (
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
