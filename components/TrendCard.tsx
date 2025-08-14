import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface TrendCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export function TrendCard({ title, value, trend, description }: TrendCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={20} color="#10B981" />;
      case 'down':
        return <TrendingDown size={20} color="#EF4444" />;
      default:
        return <Minus size={20} color="#6B7280" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#10B981';
      case 'down':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.trendContainer}>
          {getTrendIcon()}
          <Text style={[styles.value, { color: getTrendColor() }]}>{value}</Text>
        </View>
      </View>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
});