import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { ArrowLeft, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

interface ReportData {
  key_trends: string[];
  weekly_insights: string[];
  improvement_suggestions: string[];
}

interface ReportScreenProps {
  title: string;
  subtitle?: string;
  averageScore: number;
  period: string;
  reportData: ReportData;
  onClose?: () => void;
}

export default function ReportScreen() {
  const params = useLocalSearchParams();
  
  // Extract parameters from navigation
  const title = params.title as string || 'Report';
  const subtitle = params.subtitle as string;
  const averageScore = parseFloat(params.averageScore as string) || 0;
  const period = params.period as string || 'week';
  const reportData = params.reportData ? JSON.parse(params.reportData as string) : null;

  const handleClose = () => {
    if (params.onClose) {
      // If there's a custom close handler, use it
      router.back();
    } else {
      // Default behavior - go back
      router.back();
    }
  };

  if (!reportData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleClose}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Report</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No report data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleClose}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* Summary Section */}
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Average Score: <Text style={styles.scoreText}>{averageScore.toFixed(1)}/10</Text>
            </Text>
            <Text style={styles.summaryText}>
              Period: {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
            <Text style={styles.summaryText}>
              Generated on: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Key Trends Section */}
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>🔍 Key Trends</Text>
          <View style={styles.trendsCard}>
            {reportData.key_trends.map((trend: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <View style={[styles.bullet, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.listText}>{trend}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Insights Section */}
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>💡 Weekly Insights</Text>
          <View style={styles.insightsCard}>
            {reportData.weekly_insights.map((insight: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <View style={[styles.bullet, { backgroundColor: '#10B981' }]} />
                <Text style={styles.listText}>{insight}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Improvement Suggestions Section */}
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>🎯 Improvement Suggestions</Text>
          <View style={styles.suggestionsCard}>
            {reportData.improvement_suggestions.map((suggestion: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <View style={[styles.bullet, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.listText}>{suggestion}</Text>
              </View>
            ))}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Report section styles
  reportSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  trendsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
