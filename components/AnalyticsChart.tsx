import React, { useState, useEffect } from 'react';
// Corrected imports to use React Native packages as intended
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BarChart3 } from 'lucide-react-native';

interface AnalyticsChartProps {
  period: string;
  userId: number;
}

interface ChartData {
  labels: string[];
  data: number[];
  average: number;
}

// --- IMPORTANT ---
// If running on an Android emulator with a local server, use 'http://10.0.2.2:5000'.
// If on a physical device over USB, use adb reverse and 'http://localhost:5000'.
const API_BASE_URL = 'http://localhost:5000';

export function AnalyticsChart({ period, userId }: AnalyticsChartProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/mood-analytics/${userId}?period=${period}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data: ChartData = await response.json();
        setChartData(data);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [period, userId]);

  const maxValue = chartData && chartData.data.length > 0 ? Math.max(...chartData.data) : 10;
  const chartHeight = 120;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading Mood Patterns...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <BarChart3 size={20} color="#6366F1" />
          <Text style={styles.title}>Mood Patterns</Text>
        </View>
        <Text style={styles.average}>Avg: {chartData?.average?.toFixed(1) ?? 'N/A'}</Text>
      </View>

      <View style={styles.chartContainer}>
        {chartData && chartData.data.length > 0 ? (
          <View style={styles.chart}>
            {chartData.data.map((value, index) => (
              <View key={index} style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: value > 0 ? (value / maxValue) * chartHeight : 2,
                      backgroundColor: value > 7 ? '#10B981' : value > 5 ? '#F59E0B' : '#EF4444'
                    }
                  ]}
                />
                <Text style={styles.dayLabel}>{chartData.labels[index]}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.chart, styles.centerContent]}>
            <Text style={styles.dayLabel}>No mood data available for this period.</Text>
          </View>
        )}

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

// Using StyleSheet.create as is standard for React Native
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    minHeight: 250,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  average: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  chartContainer: {
    flex: 1,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 16,
    borderRadius: 8,
    minHeight: 2,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

