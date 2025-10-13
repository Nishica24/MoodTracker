import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { SocialHealthChart } from '../components/SocialHealthChart';
import { TrendCard } from '../components/TrendCard';
import { ArrowLeft, Users, MessageCircle, Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { getHistoricalSocialScores } from '../scoreFunctions/socialScore';

export default function SocialHealthScreen() {
  const [socialTrends, setSocialTrends] = useState<Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    description: string;
  }>>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);

  // Function to analyze social data and generate dynamic trends
  const analyzeSocialTrends = (socialData: number[]) => {
    if (socialData.length < 2) {
      return [
        {
          title: 'Social Interactions',
          value: 'N/A',
          trend: 'stable' as const,
          description: 'Not enough data to analyze trends'
        }
      ];
    }

    const trends: Array<{
      title: string;
      value: string;
      trend: 'up' | 'down' | 'stable';
      description: string;
    }> = [];

    // Calculate overall trend
    const firstHalf = socialData.slice(0, Math.floor(socialData.length / 2));
    const secondHalf = socialData.slice(Math.floor(socialData.length / 2));
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    const overallChange = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    trends.push({
      title: 'Social Interactions',
      value: `${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)}%`,
      trend: overallChange > 5 ? 'up' : overallChange < -5 ? 'down' : 'stable',
      description: overallChange > 5 ? 'More frequent social connections' : 
                  overallChange < -5 ? 'Fewer social interactions' : 
                  'Consistent social activity'
    });

    // Calculate consistency
    const variance = socialData.reduce((sum, val) => sum + Math.pow(val - (socialData.reduce((a, b) => a + b) / socialData.length), 2), 0) / socialData.length;
    const isConsistent = variance < 2;
    
    trends.push({
      title: 'Consistency',
      value: isConsistent ? 'Stable' : 'Variable',
      trend: isConsistent ? 'stable' : 'down',
      description: isConsistent ? 'Consistent social patterns' : 'Variable social activity'
    });

    // Calculate peak performance
    const maxScore = Math.max(...socialData);
    const minScore = Math.min(...socialData);
    const range = maxScore - minScore;
    
    trends.push({
      title: 'Performance Range',
      value: `${range.toFixed(1)}`,
      trend: range < 2 ? 'stable' : range > 4 ? 'down' : 'up',
      description: range < 2 ? 'Consistent performance' : 
                  range > 4 ? 'High variability in social activity' : 
                  'Moderate variation in social patterns'
    });

    // Calculate recent momentum
    const recentScores = socialData.slice(-3);
    const earlierScores = socialData.slice(-6, -3);
    const recentAvg = recentScores.reduce((sum, val) => sum + val, 0) / recentScores.length;
    const earlierAvg = earlierScores.length > 0 ? 
      earlierScores.reduce((sum, val) => sum + val, 0) / earlierScores.length : recentAvg;
    const momentum = ((recentAvg - earlierAvg) / earlierAvg) * 100;
    
    trends.push({
      title: 'Recent Momentum',
      value: `${momentum >= 0 ? '+' : ''}${momentum.toFixed(1)}%`,
      trend: momentum > 2 ? 'up' : momentum < -2 ? 'down' : 'stable',
      description: momentum > 2 ? 'Improving social engagement' : 
                  momentum < -2 ? 'Declining social activity' : 
                  'Steady social engagement'
    });

    return trends;
  };

  // Load and analyze social data
  useEffect(() => {
    const loadSocialData = async () => {
      setIsLoadingTrends(true);
      try {
        const historicalScores = await getHistoricalSocialScores('week');
        
        if (historicalScores.length === 0) {
          // Fallback to static data if no historical data
          const fallbackData = [7.2, 8.1, 6.8, 9.2, 8.5, 7.9, 8.8];
          const trends = analyzeSocialTrends(fallbackData);
          setSocialTrends(trends);
        } else {
          const scores = historicalScores.map(item => item.score);
          const trends = analyzeSocialTrends(scores);
          setSocialTrends(trends);
        }
      } catch (error) {
        console.error('Error loading social data for trends:', error);
        // Fallback to static data on error
        const fallbackData = [7.2, 8.1, 6.8, 9.2, 8.5, 7.9, 8.8];
        const trends = analyzeSocialTrends(fallbackData);
        setSocialTrends(trends);
      } finally {
        setIsLoadingTrends(false);
      }
    };

    loadSocialData();
  }, []);


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
            <Text style={styles.title}>Social Health</Text>
            <Text style={styles.subtitle}>Track your social wellness journey</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Weekly Chart Section */}
          <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>Weekly Graph</Text>
          </View>
          
          {/* Social Health Chart */}
          <SocialHealthChart period="week" />

          {/* Key Trends */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Trends</Text>
            {isLoadingTrends ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Analyzing your social patterns...</Text>
              </View>
            ) : (
              <View style={styles.trendsContainer}>
                {socialTrends.map((trend, index) => (
                  <TrendCard key={index} {...trend} />
                ))}
              </View>
            )}
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});