import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Camera, MessageCircle, Calendar } from 'lucide-react-native';

export function QuickActions() {
  const actions = [
    {
      icon: Plus,
      title: 'Log Mood',
      color: '#6366F1',
      backgroundColor: '#EEF2FF'
    },
    {
      icon: Camera,
      title: 'Add Photo',
      color: '#10B981',
      backgroundColor: '#ECFDF5'
    },
    {
      icon: MessageCircle,
      title: 'Journal',
      color: '#F59E0B',
      backgroundColor: '#FFFBEB'
    },
    {
      icon: Calendar,
      title: 'Schedule',
      color: '#EF4444',
      backgroundColor: '#FEF2F2'
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {actions.map((action, index) => (
          <TouchableOpacity key={index} style={[styles.actionButton, { backgroundColor: action.backgroundColor }]}>
            <action.icon size={24} color={action.color} />
            <Text style={[styles.actionText, { color: action.color }]}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});