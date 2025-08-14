import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ChartBar as BarChart3 } from 'lucide-react-native';

interface AnalyticsChartProps {
  period: string;
}

export function AnalyticsChart({ period }: AnalyticsChartProps) {
  // Simulated data points for mood tracking
  const moodData = [6.5, 7.2, 6.8, 8.1, 7.5, 6.9, 8.3];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const maxValue = Math.max(...moodData);
  const chartHeight = 120;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <BarChart3 size={20} color="#6366F1" />
          <Text style={styles.title}>Mood Patterns</Text>
        </View>
        <Text style={styles.average}>Avg: 7.3</Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {moodData.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (value / maxValue) * chartHeight,
                    backgroundColor: value > 7 ? '#10B981' : value > 5 ? '#F59E0B' : '#EF4444'
                  }
                ]}
              />
              <Text style={styles.dayLabel}>{days[index]}</Text>
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Good (7-10)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Okay (5-7)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Low (1-5)</Text>
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
});