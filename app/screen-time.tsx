import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { ScreenTimeChart } from '@/components/ScreenTimeChart';
import { TrendCard } from '@/components/TrendCard';
import { ArrowLeft, Smartphone, TrendingDown, TrendingUp, Monitor } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenTimeService, ScreenTimeData, AppUsageData } from '@/services/ScreenTimeService';
import { generateScreenTimeReport, formatScreenTimeData } from '@/services/reportService';

export default function ScreenTimeScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [screenTimeData, setScreenTimeData] = useState<ScreenTimeData[]>([]);
  const [appUsageData, setAppUsageData] = useState<AppUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const periods = [
    { key: 'week', label: 'Week' },
  ];

  useEffect(() => {
    loadScreenTimeData();
  }, [selectedPeriod]);

  const loadScreenTimeData = async () => {
    try {
      setIsLoading(true);
      
      // Check permission
      const permission = await ScreenTimeService.checkPermission();
      setHasPermission(permission);
      
      if (!permission) {
        setIsLoading(false);
        return;
      }

      // Load screen time and app usage data
      const [screenData, appData] = await Promise.all([
        ScreenTimeService.getScreenTimeData(),
        ScreenTimeService.getAppUsageData()
      ]);
      
      setScreenTimeData(screenData);
      setAppUsageData(appData);
    } catch (error) {
      console.error('Error loading screen time data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScreenTimeData();
    setRefreshing(false);
  };

  // Calculate trends from real data
  const screenTimeTrends = React.useMemo(() => {
    if (screenTimeData.length === 0) return [];
    
    const trends = ScreenTimeService.calculateScreenTimeTrends(screenTimeData);
    
    return [
      {
        title: 'Daily Average',
        value: `${trends.average}h`,
        trend: trends.trend,
        description: `Screen time per day`
      },
      {
        title: 'Weekly Total',
        value: `${trends.total}h`,
        trend: 'stable' as const,
        description: `Total screen time this week`
      },
      {
        title: 'Trend Change',
        value: `${trends.change > 0 ? '+' : ''}${trends.change}%`,
        trend: trends.trend,
        description: `Compared to previous period`
      },
      {
        title: 'Top App',
        value: appUsageData.length > 0 ? `${appUsageData[0].usageHours.toFixed(1)}h` : 'N/A',
        trend: 'stable' as const,
        description: `Most used app today`
      },
    ];
  }, [screenTimeData, appUsageData]);




  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Screen Time</Text>
            <Text style={styles.subtitle}>Track your digital wellness journey</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Weekly Chart Section */}
          <View style={styles.chartSection}>
            <Text style={styles.chartSectionTitle}>Weekly Graph</Text>
          </View>
          
          {/* Screen Time Chart */}
          <ScreenTimeChart 
            period={selectedPeriod} 
            screenTimeData={screenTimeData}
            appUsageData={appUsageData}
          />

          {/* Key Trends */}
          {screenTimeTrends.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Trends</Text>
              <View style={styles.trendsContainer}>
                {screenTimeTrends.map((trend, index) => (
                  <TrendCard key={index} {...trend} />
                ))}
              </View>
            </View>
          )}



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
});
