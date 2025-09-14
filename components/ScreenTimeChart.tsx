import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Smartphone, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react-native';
import { ScreenTimeService, ScreenTimeData } from '@/services/ScreenTimeService';

interface ScreenTimeChartProps {
  period: string;
}

export function ScreenTimeChart({ period }: ScreenTimeChartProps) {
  const [screenTimeData, setScreenTimeData] = useState<ScreenTimeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    loadScreenTimeData();
  }, [period]);

  const loadScreenTimeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check permission first
      const permission = await ScreenTimeService.checkPermission();
      setHasPermission(permission);

      if (!permission) {
        setError('Screen time permission is required. Please grant usage access permission in settings.');
        return;
      }

      const data = await ScreenTimeService.getScreenTimeData();
      setScreenTimeData(data);
    } catch (err: any) {
      console.error('Error loading screen time data:', err);
      setError(err.message || 'Failed to load screen time data');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      await ScreenTimeService.requestPermission();
      // Permission request opens settings, user needs to manually grant it
    } catch (err) {
      console.error('Error requesting permission:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Smartphone size={20} color="#06B6D4" />
            <Text style={styles.title}>Daily Screen Time</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading screen time data...</Text>
        </View>
      </View>
    );
  }

  if (error || !hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Smartphone size={20} color="#06B6D4" />
            <Text style={styles.title}>Daily Screen Time</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={24} color="#EF4444" />
          <Text style={styles.errorText}>
            {error || 'Screen time permission is required'}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const screenTimeHours = screenTimeData.map(day => day.screenTimeHours);
  const maxValue = Math.max(...screenTimeHours, 1); // Ensure minimum value for chart
  const chartHeight = 120;
  const average = screenTimeHours.reduce((sum, hours) => sum + hours, 0) / screenTimeHours.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Smartphone size={20} color="#06B6D4" />
          <Text style={styles.title}>Daily Screen Time</Text>
        </View>
        <Text style={styles.average}>Avg: {average.toFixed(1)}h</Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {screenTimeHours.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (value / maxValue) * chartHeight,
                    backgroundColor: value < 4 ? '#10B981' : value < 6 ? '#F59E0B' : '#EF4444'
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
            <Text style={styles.legendText}>Excellent (&lt;4h)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Moderate (4-6h)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>High (&gt;6h)</Text>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
