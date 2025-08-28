import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Platform, PermissionsAndroid, AppState
} from 'react-native';
import { ConnectionCard } from '@/components/ConnectionCard';
import { Plus, Smartphone, Watch, Calendar, Activity, Headphones, Phone, LucideProps } from 'lucide-react-native';

// STEP 3: Import the function from its new location
import { handleCallLogPermission, openAppSettings } from '@/services/permissions'; // Use your correct path alias or relative path

// --- Type Definitions ---
type Connection = {
  id: string;
  name: string;
  icon: React.FC<LucideProps>;
  connected: boolean;
  description: string;
  color: string;
};

// --- Initial Data ---
const initialConnections: Connection[] = [
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
    }
];


if (Platform.OS === 'android') {
  initialConnections.push({
    id: '6',
    name: 'Call Log Access',
    icon: Phone,
    connected: false,
    description: 'Social activity patterns and engagement',
    color: '#FF9500'
  });
}

// --- The Main Component ---
export default function ConnectionsScreen() {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const appState = useRef(AppState.currentState);

  // The 'handleCallLogPermission' function is now GONE from here.

  useEffect(() => {

    // Function to check which permission have been granted
    const syncPermissions = async () => {
      if (Platform.OS === 'android') {
        // We can even use our modular function here for checking!
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
        setConnections(prev =>
          prev.map(conn =>
            conn.id === '6' ? { ...conn, connected: hasPermission } : conn
          )
        );
      }
    };
    syncPermissions();

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Check if the app is returning from the background to the foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        // Re-sync the permissions when the user comes back to the app
        syncPermissions();
      }

      appState.current = nextAppState;
    });

    // This is the cleanup function. It runs when the component unmounts.
    return () => {
      subscription.remove();
    };
  }, []);

  const toggleConnection = async (id: string) => {

    // if construct to call permissions function for call logs. Similarly add for other permissions
    if (id === '6') {

      // Check if permission is already granted to understand if the user is trying revoke the permission
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);

      if(hasPermission) {
        openAppSettings();
      }
      else {

          // Call the function to request permission
          const isGranted = await handleCallLogPermission();

          // Update the state based on permission request
          setConnections(prev =>
              prev.map(conn =>
                conn.id === id ? { ...conn, connected: isGranted } : conn
              )
            );
      }
      return;
    }

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