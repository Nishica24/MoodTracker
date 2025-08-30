import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatsCard } from '@/components/StatsCard';
import { QuickActions } from '@/components/QuickActions';
import { Heart, Zap, Moon, Smartphone, DollarSign, LucideIcon, Plus, TrendingUp } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { updateDailyHistory } from '@/services/callLogsServices';
import { calculateSocialScore } from '@/scoreFunctions/socialScore';

export default function DashboardScreen() {

   const { result } = useLocalSearchParams();  // ✅ Changed to match your dashboard
   const data = result ? JSON.parse(result as string) : null;  // ✅ Added this line

  const [moodScores, setMoodScores] = useState<any[]>([]);
  const [socialScore, setSocialScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Updated useEffect to work with your dashboard data
  useEffect(() => {

    const initializeDashboard = async () => {
        // --- This is your existing logic for mood data ---
        if (data) {
          // Create mock mood_scores for compatibility with existing code
          const mockMoodScores = [{
              emotion: data.mood?.toLowerCase() || 'neutral',
              confidence: data.mood_level ? data.mood_level / 10 : 0.5,
              percentage: data.mood_level ? data.mood_level * 10 : 50
          }];
          setMoodScores(mockMoodScores);
        }

      // try-catch block to update call logs, user baseline, and calculate and get social score
      try {

        // First, ensure the daily history is up-to-date.
        await updateDailyHistory();

        // Then, calculate the social score.
        const score = await calculateSocialScore();
        setSocialScore(score);

      } catch (error) {
        console.error("Failed to calculate social score:", error);
        setSocialScore(5.0); // Set a neutral score on error
      }
      setIsLoading(false);
    }

    initializeDashboard();
  }, []);

  
  // Generate dynamic stats based on mood scores
  const getDynamicStats = (): Array<{
    icon: LucideIcon;
    title: string;
    value: string;
    subtitle: string;
    color: string;
    trend: 'up' | 'stable' | 'down';
    onPress?: () => void;
  }> => {
    if (moodScores.length === 0) return [];
    
    return [
      {
        icon: Heart,
        title: 'Social Health',
        value: socialScore !== null ? `${socialScore.toFixed(1)}` : '...', // Show score or loading dots
        subtitle: '+0.5 from last week',
        color: '#EF4444',
        trend: 'up',
        onPress: () => router.push('./social-health')
      },
      {
        icon: DollarSign,
        title: 'Spending Wellness',
        value: '$247',
        subtitle: 'This week',
        color: '#10B981',
        trend: 'stable',
        onPress: () => router.push('./spending-wellness')
      },
      {
        icon: Zap,
        title: 'Work Stress',
        value: '4.2/10',
        subtitle: 'Moderate level',
        color: '#F59E0B',
        trend: 'down',
        onPress: () => router.push('./work-stress')
      },
      {
        icon: Moon,
        title: 'Sleep Quality',
        value: '7.5h',
        subtitle: 'Avg this week',
        color: '#8B5CF6',
        trend: 'up',
        onPress: () => router.push('./sleep-quality')
      },
      {
        icon: Smartphone,
        title: 'Screen Time',
        value: '4.2h',
        subtitle: 'Today',
        color: '#06B6D4',
        trend: 'down',
        onPress: () => router.push('./screen-time')
      },
    ];
  };

  const stats = getDynamicStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}>

        <View style={styles.header}>
          <Text style={styles.greeting}>Good afternoon!</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>

        {/* Current Mood Card - Integrated with your backend data */}
        <View style={styles.moodCard}>
          <View style={styles.moodCardHeader}>
            <Text style={styles.moodCardTitle}>Current Mood</Text>
            <TouchableOpacity style={styles.addButton}>
              <Plus size={20} color="#6366F1" />
            </TouchableOpacity>
          </View>

          <View style={styles.moodDisplay}>
            <Text style={styles.moodEmoji}>
              {data?.emoji || '😊'}
            </Text>
            <View style={styles.moodInfo}>
              <Text style={styles.moodLabel}>
                {data?.mood || 'Neutral'}
              </Text>
              <Text style={styles.moodDate}>
                {data?.timestamp ? new Date(data.timestamp).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }) : 'Today, 03:16'}
              </Text>
            </View>
          </View>

          {/* AI Analysis Section */}
          <View style={styles.aiAnalysisSection}>
            <Text style={styles.aiAnalysisTitle}>AI Analysis</Text>
            <Text style={styles.aiAnalysisPrimary}>
              Primary: {data?.mood || 'Neutral'} ({data?.mood_level ? Math.round((data.mood_level / 10) * 100) : 80}%)
            </Text>
            <View style={styles.aiAnalysisTag}>
              <Text style={styles.aiAnalysisTagText}>
                {data?.mood || 'Neutral'} {data?.mood_level ? Math.round((data.mood_level / 10) * 100) : 80}%
              </Text>
            </View>
          </View>

          {/* Mood Level Section */}
          <View style={styles.moodLevelSection}>
            <Text style={styles.moodLevelTitle}>Mood Level</Text>
            <View style={styles.moodLevelBar}>
              <View 
                style={[
                  styles.moodLevelFill, 
                  { width: `${((data?.mood_level || 5) / 10) * 100}%` }
                ]} 
              />
            </View>
            <View style={styles.moodLevelIndicator}>
              <Text style={styles.moodLevelText}>
                {data?.mood_level || 5}/10
              </Text>
              <View style={styles.trendContainer}>
                <TrendingUp size={16} color="#10B981" />
                <Text style={styles.trendText}>+0.5</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Wellness Stats</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <StatsCard
                key={index}
                icon={stat.icon}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                color={stat.color}
                trend={stat.trend}
                onPress={stat.onPress}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <QuickActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },
  
  // Header styles
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280' },
  
  // Mood Card styles - matching the image design
  moodCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  moodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moodEmoji: {
    fontSize: 48,
  },
  moodInfo: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  moodDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  
  // AI Analysis Section
  aiAnalysisSection: {
    gap: 8,
  },
  aiAnalysisTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  aiAnalysisPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  aiAnalysisTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  aiAnalysisTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  
  // Mood Level Section
  moodLevelSection: {
    gap: 8,
  },
  moodLevelTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  moodLevelBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodLevelFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  moodLevelIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodLevelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },

  scrollContent: {
      paddingBottom: 150, // Adds 48 pixels of space after the last item
    },
  
  // Stats section styles
  statsContainer: { paddingHorizontal: 24, marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  statsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
});