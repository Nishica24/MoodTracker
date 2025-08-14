import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { ConnectionCard } from '@/components/ConnectionCard';
import { Plus, Smartphone, Watch, Calendar, Activity, Headphones } from 'lucide-react-native';

export default function ConnectionsScreen() {
  const [connections, setConnections] = useState([
    {
      id: '1',
      name: 'Apple Health',
      icon: Activity,
      connected: true,
      description: 'Sleep, heart rate, and activity data',
      color: '#FF3B30'
    },
    {
      id: '2',
      name: 'Google Fit',
      icon: Smartphone,
      connected: true,
      description: 'Steps, workouts, and health metrics',
      color: '#4285F4'
    },
    {
      id: '3',
      name: 'Calendar App',
      icon: Calendar,
      connected: false,
      description: 'Work schedule and stress correlation',
      color: '#34C759'
    },
    {
      id: '4',
      name: 'Screen Time',
      icon: Watch,
      connected: true,
      description: 'App usage and digital wellness',
      color: '#007AFF'
    },
    {
      id: '5',
      name: 'Spotify',
      icon: Headphones,
      connected: false,
      description: 'Music listening habits and mood',
      color: '#1DB954'
    },
  ]);

  const toggleConnection = (id: string) => {
    setConnections(prev => 
      prev.map(conn => 
        conn.id === id ? { ...conn, connected: !conn.connected } : conn
      )
    );
  };

  const connectedCount = connections.filter(conn => conn.connected).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Connected Apps</Text>
          <Text style={styles.subtitle}>
            {connectedCount} of {connections.length} apps connected
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Activity size={24} color="#6366F1" />
              <Text style={styles.statusTitle}>Live Analysis Active</Text>
            </View>
            <Text style={styles.statusDescription}>
              Connected apps are continuously providing data for real-time mood analysis 
              and personalized insights.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Connections</Text>
              <TouchableOpacity style={styles.addButton}>
                <Plus size={20} color="#6366F1" />
              </TouchableOpacity>
            </View>

            <View style={styles.connectionsList}>
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  {...connection}
                  onToggle={() => toggleConnection(connection.id)}
                />
              ))}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Why Connect Apps?</Text>
            <Text style={styles.infoText}>
              Connecting your apps allows MoodTracker to provide more accurate insights 
              by analyzing patterns across your digital life, health metrics, and daily activities.
            </Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionsList: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3730A3',
  },
  infoText: {
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
});