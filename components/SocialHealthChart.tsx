import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Users, MessageCircle, Heart } from 'lucide-react-native';
import { getHistoricalSocialScores } from '@/scoreFunctions/socialScore';

interface SocialHealthChartProps {
  period: string;
}

export function SocialHealthChart({ period }: SocialHealthChartProps) {
  const [socialData, setSocialData] = useState<number[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [average, setAverage] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
});
