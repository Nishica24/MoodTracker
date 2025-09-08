import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatsCard } from '@/components/StatsCard';
import { QuickActions } from '@/components/QuickActions';
import { Heart, Zap, Moon, Smartphone, DollarSign, LucideIcon, Plus, TrendingUp } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { updateDailyHistory } from '@/services/callLogsServices';
import { calculateSocialScore } from '@/scoreFunctions/socialScore';
import { handleCallLogPermission } from '@/services/permissions';

// --- NEW IMPORTS FOR SLEEP TRACKING ---
import { SleepPermissionTester } from '@/components/SleepPermissionTester';
import { SleepService, SleepSegment } from '@/services/SleepService';

const getGreeting = (): string => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return 'Good morning!';
  if (currentHour < 18) return 'Good afternoon!';
  return 'Good evening!';
};

export default function DashboardScreen() {
  const { result } = useLocalSearchParams();
  const data = result ? JSON.parse(result as string) : null;

  const [socialScore, setSocialScore] = useState<number | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  // --- NEW STATE FOR SLEEP DATA ---
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepScore, setSleepScore] = useState<number | null>(null);

  // --- USE EFFECT FOR SLEEP LISTENER ---
  useEffect(() => {
    const subscription = SleepService.addSleepListener(events => {
      console.log('Received Sleep Data:', events);
      const lastNightSleep = events.find(e => e.status === 1);
      if (lastNightSleep) {
        const durationHours = (lastNightSleep.endTimeMillis - lastNightSleep.startTimeMillis) / (1000 * 60 * 60);
        setSleepHours(durationHours);

        // Simple scoring logic
        if (durationHours < 4) setSleepScore(40);
        else if (durationHours < 6) setSleepScore(65);
        else if (durationHours <= 9) setSleepScore(95);
        else setSleepScore(80);
      }
    });

    // Clean up the listener when the component unmounts
    return () => {
      subscription.remove();
    };
  }, []);

  // Combined useEffect for initialization
  useEffect(() => {
    const initializeDashboard = async () => {
      if (data) setOverallScore(data.mood_level || 5);
      const permissionGranted = await handleCallLogPermission();
      if (permissionGranted) {
        try {
          await updateDailyHistory();
          const score = await calculateSocialScore();
          setSocialScore(score);
        } catch (error) { setSocialScore(5.0); }
      } else { setSocialScore(null); }
    }
    initializeDashboard();
  }, [data]);

  // useEffect to recalculate overall score
  useEffect(() => {
    if (data?.mood_level) {
      const scores = [
        { value: data.mood_level, weight: 0.5 },
        { value: socialScore, weight: 0.3 },
        { value: sleepScore ? sleepScore / 10 : null, weight: 0.2 },
      ].filter(s => s.value !== null);

      const totalWeight = scores.reduce((acc, curr) => acc + curr.weight, 0);
      const weightedSum = scores.reduce((acc, curr) => acc + curr.value! * curr.weight, 0);

      if (totalWeight > 0) setOverallScore(weightedSum / totalWeight);
    }
  }, [socialScore, sleepScore, data]);

  const stats: Array<{
    icon: LucideIcon;
    title: string;
    value: string;
    subtitle: string;
    color: string;
    trend: 'up' | 'stable' | 'down';
    onPress: () => void;
  }> = [
    { icon: Heart, title: 'Social Health', value: socialScore ? socialScore.toFixed(1) : 'N/A', subtitle: 'Based on calls', color: '#EF4444', trend: 'up' as const, onPress: () => router.push('./social-health') },
    { icon: DollarSign, title: 'Spending Wellness', value: '$247', subtitle: 'This week', color: '#10B981', trend: 'stable' as const, onPress: () => router.push('./spending-wellness') },
    { icon: Zap, title: 'Work Stress', value: '4.2/10', subtitle: 'Moderate level', color: '#F59E0B', trend: 'down' as const, onPress: () => router.push('./work-stress') },
    { icon: Smartphone, title: 'Screen Time', value: '4.2h', subtitle: 'Today', color: '#06B6D4', trend: 'down' as const, onPress: () => router.push('./screen-time') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>

        <View style={styles.moodCard}>
          {/* ... existing mood card content ... */}
          <View style={styles.moodLevelSection}>
            <Text style={styles.moodLevelTitle}>Overall Mood Level</Text>
            <View style={styles.moodLevelBar}>
              <View style={[styles.moodLevelFill, { width: `${((overallScore || 5) / 10) * 100}%` }]}/>
            </View>
            <View style={styles.moodLevelIndicator}>
              <Text style={styles.moodLevelText}>{overallScore ? overallScore.toFixed(1) : '5.0'}/10</Text>
              {/* Trend logic can be added here */}
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Wellness Stats</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
            
            {/* Custom Sleep Quality Card with Testing Component */}
            <View style={styles.sleepCard}>
              <View style={styles.sleepCardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
                  <Moon size={20} color="#8B5CF6" />
                </View>
                <TrendingUp size={16} color="#10B981" />
              </View>
              <Text style={styles.sleepCardTitle}>Sleep Quality</Text>
              <Text style={styles.sleepCardValue}>
                {sleepHours ? `${sleepHours.toFixed(1)}h` : 'N/A'}
              </Text>
              <Text style={styles.sleepCardSubtitle}>
                {sleepScore ? `Score: ${sleepScore}/100` : 'No data yet'}
              </Text>
              <SleepPermissionTester />
            </View>
          </View>
        </View>

        <QuickActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280' },
  moodCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginHorizontal: 24, marginBottom: 24, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  moodLevelSection: { gap: 8 },
  moodLevelTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  moodLevelBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  moodLevelFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  moodLevelIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodLevelText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  scrollContent: { paddingBottom: 150 },
  statsContainer: { paddingHorizontal: 24, marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  statsGrid: { flexDirection: 'column', gap: 16 },
  
  // Custom Sleep Card styles
  sleepCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sleepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  sleepCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  sleepCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
});