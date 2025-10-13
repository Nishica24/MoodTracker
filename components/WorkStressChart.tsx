import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Zap, TrendingDown, TrendingUp, FileText } from 'lucide-react-native';
import { fetchWorkStress } from '../services/microsoftPermission';
import { generateWorkStressReport, createMockWorkStressData } from '../services/reportService';
import { generateAndShowReport } from '../utils/reportUtils';

interface WorkStressChartProps {
  period: string;
}

export function WorkStressChart({ period }: WorkStressChartProps) {
  const [stressData, setStressData] = useState<number[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [average, setAverage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const maxValue = 10; // Stress scale is 1-10
  const chartHeight = 120;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const result = await fetchWorkStress(period as 'week' | 'month' | 'quarter');
        if (cancelled) return;
        if (Array.isArray(result?.data) && result?.data.length > 0) {
          setStressData(result.data.map(v => (typeof v === 'number' ? v : Number(v))));
          setDays(Array.isArray(result.labels) && result.labels.length > 0 ? result.labels : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
          setAverage(typeof result.average === 'number' ? result.average : 0);
        } else {
          // Fallback if backend returns empty
          const fallback = [6.2, 4.8, 7.1, 5.5, 8.2, 3.9, 4.2];
          setStressData(fallback);
          setDays(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
          setAverage(parseFloat((fallback.reduce((a,b)=>a+b,0)/fallback.length).toFixed(1)));
        }
      } catch (e) {
        // Fallback on error
        const fallback = [6.2, 4.8, 7.1, 5.5, 8.2, 3.9, 4.2];
        setStressData(fallback);
        setDays(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
        setAverage(parseFloat((fallback.reduce((a,b)=>a+b,0)/fallback.length).toFixed(1)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [period]);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await generateAndShowReport(
        async () => {
          // Create work stress data from current stress scores
          const workStressData = createMockWorkStressData(stressData);
          
          // Generate the report
          const report = await generateWorkStressReport(workStressData);
          
          // Check if report has an error
          if ((report as any).error) {
            throw new Error(`Server error: ${(report as any).error}`);
          }
          
          return report;
        },
        {
          title: '⚡ Work Stress Report',
          subtitle: 'Analyze your work stress patterns',
          averageScore: average,
          period: period,
        }
      );
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Zap size={20} color="#F59E0B" />
            <Text style={styles.title}>Work Stress Levels</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading your work stress data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Zap size={20} color="#F59E0B" />
          <Text style={styles.title}>Work Stress Levels</Text>
        </View>
        <Text style={styles.average}>Avg: {average ? `${average.toFixed(1)}/10` : '—'}</Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {stressData.length > 0 ? stressData.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <Text style={styles.scoreLabel}>{value.toFixed(1)}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: (value / maxValue) * chartHeight,
                    backgroundColor: value < 4 ? '#10B981' : value < 7 ? '#F59E0B' : '#EF4444'
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
            <Text style={styles.legendText}>Low (&lt;4/10)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Moderate (4-7/10)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>High (&gt;7/10)</Text>
          </View>
        </View>

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
    paddingHorizontal: 0,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingHorizontal: 0,
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
  scoreLabel: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 0,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
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
