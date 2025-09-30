import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Smartphone, TrendingDown, TrendingUp, AlertCircle, FileText } from 'lucide-react-native';
import { ScreenTimeService, ScreenTimeData, AppUsageData } from '@/services/ScreenTimeService';
import { generateScreenTimeReport, formatScreenTimeData } from '@/services/reportService';
import { router } from 'expo-router';

interface ScreenTimeChartProps {
  period: string;
  screenTimeData?: ScreenTimeData[];
  appUsageData?: AppUsageData[];
}

export function ScreenTimeChart({ period, screenTimeData: propScreenTimeData, appUsageData: propAppUsageData }: ScreenTimeChartProps) {
  const [screenTimeData, setScreenTimeData] = useState<ScreenTimeData[]>([]);
  const [appUsageData, setAppUsageData] = useState<AppUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

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

      // Use props if available, otherwise fetch data
      if (propScreenTimeData && propAppUsageData) {
        setScreenTimeData(propScreenTimeData);
        setAppUsageData(propAppUsageData);
      } else {
        // Load screen time and app usage data
        const [screenData, appData] = await Promise.all([
          ScreenTimeService.getScreenTimeData(),
          ScreenTimeService.getAppUsageData()
        ]);
        
        setScreenTimeData(screenData);
        setAppUsageData(appData);
      }
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

  const handleGenerateReport = async () => {
    if (!hasPermission || screenTimeData.length === 0) {
      return;
    }

    try {
      setGeneratingReport(true);
      
      // Format the data for the report
      const formattedData = formatScreenTimeData(
        screenTimeData.map(d => ({ date: d.date, screenTimeMs: d.screenTimeMs })),
        appUsageData.map(a => ({ packageName: a.packageName, usageMs: a.usageMs }))
      );
      
      // Generate the report
      const report = await generateScreenTimeReport(formattedData);
      
      // Calculate average screen time for the report
      const avgScreenTime = screenTimeData.length > 0 
        ? screenTimeData.reduce((sum, day) => sum + day.screenTimeHours, 0) / screenTimeData.length 
        : 0;

      // Navigate to report page with the generated data
      router.push({
        pathname: '/report',
        params: { 
          title: 'Screen Time Report',
          subtitle: 'Digital Wellness Analysis',
          averageScore: avgScreenTime,
          period: period,
          reportData: JSON.stringify(report)
        }
      });
    } catch (error) {
      console.error('Error generating screen time report:', error);
      // You could add a toast or alert here
    } finally {
      setGeneratingReport(false);
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

  const toHours = (d: ScreenTimeData) => {
    if (typeof d.screenTimeHours === 'number') return d.screenTimeHours;
    // @ts-ignore support payloads that have only ms
    if (typeof d.screenTimeMs === 'number') return d.screenTimeMs / (1000 * 60 * 60);
    return 0;
  };

  const formatHM = (hours: number) => {
    const totalMinutes = Math.max(0, Math.round(hours * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const screenTimeHours = screenTimeData.map(toHours);
  const maxValue = Math.max(...screenTimeHours, 1); // Ensure minimum value for chart
  const chartHeight = 120;
  const average = screenTimeHours.reduce((sum, hours) => sum + hours, 0) / screenTimeHours.length;
  const labels = screenTimeData.map(d => {
    try {
      const dt = new Date(d.date);
      const weekday = dt.toLocaleDateString(undefined, { weekday: 'short' });
      const day = dt.getDate();
      return `${weekday}\n${day}`;
    } catch {
      return '';
    }
  });

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
              <Text style={styles.valueLabel}>{formatHM(value)}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: (value / maxValue) * chartHeight,
                    backgroundColor: value < 4 ? '#10B981' : value < 6 ? '#F59E0B' : '#EF4444'
                  }
                ]}
              />
              <Text style={styles.dayLabel}>{labels[index] || days[index]}</Text>
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

        {/* Generate Report Button - Only show if permission granted and data available */}
        {hasPermission && screenTimeData.length > 0 && (
          <TouchableOpacity 
            style={styles.generateReportButton} 
            onPress={handleGenerateReport}
            disabled={generatingReport}
          >
            <FileText size={16} color="white" />
            <Text style={styles.generateReportButtonText}>
              {generatingReport ? 'Generating...' : 'Generate Report'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 26,
    gap: 16,
    minHeight: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
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
    height: 180,
    paddingHorizontal: 8,
    paddingTop: 24, // reserve space for value labels to avoid header overlap
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  valueLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
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
    paddingTop: 6,
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
  generateReportButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  generateReportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
