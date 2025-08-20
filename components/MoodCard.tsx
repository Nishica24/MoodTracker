import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, TrendingUp } from 'lucide-react-native';

interface MoodCardProps {
  emoji: string;
  label: string;
  level: number;
  date: string;
}

export function MoodCard({ emoji, label, level, date }: MoodCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Current Mood</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <View style={styles.moodDisplay}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.moodInfo}>
          <Text style={styles.moodLabel}>{label}</Text>
          <Text style={styles.moodDate}>{date}</Text>
        </View>
      </View>

      <View style={styles.levelContainer}>
        <Text style={styles.levelLabel}>Mood Level</Text>
        <View style={styles.levelBar}>
          <View style={[styles.levelFill, { width: `${(level / 10) * 100}%` }]} />
        </View>
        <View style={styles.levelIndicator}>
          <Text style={styles.levelText}>{level}/10</Text>
          <View style={styles.trendContainer}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.trendText}>+0.5</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  emoji: {
    fontSize: 48,
  },
  moodInfo: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  moodDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  levelContainer: {
    gap: 8,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  levelBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  levelIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
});
