import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatsCard } from '@/components/StatsCard';
import { QuickActions } from '@/components/QuickActions';
import { Heart, Zap, Moon, Smartphone, DollarSign, LucideIcon, Plus, TrendingUp } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
// --- CORRECTED --- Use relative paths for stability
import { updateDailyHistory } from '../../services/callLogsServices';
import { calculateSocialScore } from '../../scoreFunctions/socialScore';
import { handleCallLogPermission } from '@/services/permissions';

// --- NEW FUNCTION ---
/**
 * Returns a greeting based on the current hour of the day.
 */
const getGreeting = (): string => {
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return 'Good morning!';
  } else if (currentHour < 18) {
    return 'Good afternoon!';
  } else {
    return 'Good evening!';
  }
};

export default function DashboardScreen() {

   const { result } = useLocalSearchParams();
   const data = result ? JSON.parse(result as string) : null;

  const [moodScores, setMoodScores] = useState<any[]>([]);
  const [socialScore, setSocialScore] = useState<number | null>(null);
  // --- NEW --- State for the combined overall score
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This useEffect handles the initial data loading and call log processing
  useEffect(() => {
    const initializeDashboard = async () => {
        setIsLoading(true);

        // --- Initial logic for mood data ---
        if (data) {
          const mockMoodScores = [{
              emotion: data.mood?.toLowerCase() || 'neutral',
              confidence: data.mood_level ? data.mood_level / 10 : 0.5,
              percentage: data.mood_level ? data.mood_level * 10 : 50
          }];
          setMoodScores(mockMoodScores);
          // --- NEW --- Set the initial overall score based on mood level alone
          setOverallScore(data.mood_level || 5);
        }

      const permissionGranted = await handleCallLogPermission();

      if (permissionGranted) {
          console.log("Call Log permission granted. Calculating social score...");
          try {
            await updateDailyHistory();
            const score = await calculateSocialScore();
            setSocialScore(score); // This will trigger the other useEffect
          } catch (error) {
            console.error("Failed to calculate social score:", error);
            setSocialScore(5.0); // Set a neutral score on error
          }
      } else {
        console.log("Call Log permission denied. Social score will not be shown.");
        setSocialScore(null); // Set to null to show '...' or 'N/A' in the UI
      }
      setIsLoading(false);
    }
    initializeDashboard();
  }, []);


  // --- NEW --- This useEffect reacts to changes in the social score and updates the overall score
  useEffect(() => {
    console.log("Detected a change in social score, recalculating overall score...");
    if (data?.mood_level) {
        if (socialScore !== null) {
            // --- Weighted Average Calculation ---
            // You can adjust these weights as you see fit.
            const moodWeight = 0.6; // 60%
            const socialWeight = 0.4; // 40%
            const newOverallScore = (data.mood_level * moodWeight) + (socialScore * socialWeight);
            setOverallScore(newOverallScore);
            console.log(`New Overall Score: ${newOverallScore.toFixed(1)} (Mood: ${data.mood_level}, Social: ${socialScore})`);
        } else {
            // If social score isn't available, the overall score is just the mood level
            setOverallScore(data.mood_level);
        }
    }
  }, [socialScore, data]);


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
        value: socialScore !== null ? `${socialScore.toFixed(1)}` : 'N/A',
        subtitle: socialScore !== null ? 'vs. your average' : 'Permission needed',
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
          <Text style={styles.greeting}>{getGreeting()}</Text>
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

          {/* --- MODIFIED Mood Level Section --- */}
          <View style={styles.moodLevelSection}>
            <Text style={styles.moodLevelTitle}>Overall Mood Level</Text>
            <View style={styles.moodLevelBar}>
              <View
                style={[
                  styles.moodLevelFill,
                  { width: `${((overallScore || 5) / 10) * 100}%` }
                ]}
              />
            </View>
            <View style={styles.moodLevelIndicator}>
              <Text style={styles.moodLevelText}>
                {overallScore ? overallScore.toFixed(1) : '5.0'}/10
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