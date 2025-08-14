import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';

interface ConnectionCardProps {
  name: string;
  icon: React.ComponentType<any>;
  connected: boolean;
  description: string;
  color: string;
  onToggle: () => void;
}

export function ConnectionCard({ name, icon: Icon, connected, description, color, onToggle }: ConnectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon size={24} color={color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      
      <Switch
        value={connected}
        onValueChange={onToggle}
        trackColor={{ false: '#F3F4F6', true: '#6366F1' }}
        thumbColor={connected ? 'white' : '#9CA3AF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});