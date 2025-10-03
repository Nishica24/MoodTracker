import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Platform, PermissionsAndroid, AppState
} from 'react-native';
import { ConnectionCard } from '@/components/ConnectionCard';
import { Plus, Smartphone, Watch, Calendar, Activity, Headphones, Phone, Moon, Mail, LucideProps } from 'lucide-react-native';
import { handleMicrosoftLogin, fetchMicrosoftMe, getMicrosoftConnectionStatus, setMicrosoftConnectionStatus } from '@/services/microsoftPermission';
import { router } from 'expo-router';

// STEP 3: Import the function from its new location
import { handleCallLogPermission, openAppSettings } from '@/services/permissions'; // Use your correct path alias or relative path
import { SleepService } from '@/services/SleepService';
import { ScreenTimeService } from '@/services/ScreenTimeService';

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
      id: '1', // Microsoft Outlook
      name: 'Microsoft Outlook',
      icon: Mail,
      connected: false,
      description: 'Calendar events and email patterns',
      color: '#0078D4'
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
      connected: false,
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
  
  initialConnections.push({
    id: '7',
    name: 'Sleep Tracking',
    icon: Moon,
    connected: false,
    description: 'Sleep quality and duration analysis',
    color: '#8B5CF6'
  });
}

// --- The Main Component ---
export default function ConnectionsScreen() {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const appState = useRef(AppState.currentState);

  const [msProfileName, setMsProfileName] = useState<string | null>(null);

  useEffect(() => {

    // Function to check which permission have been granted
    const syncPermissions = async () => {
      // Check Microsoft connection status
      const microsoftConnected = await getMicrosoftConnectionStatus();
      
      if (Platform.OS === 'android') {
        // Check call log permission
        const hasCallLogPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
        
        // Check sleep permission (activity recognition)
        const hasSleepPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
        
        // Check screen time permission via native module
        const hasScreenTimePermission = await ScreenTimeService.checkPermission();
        
        setConnections(prev =>
          prev.map(conn => {
            if (conn.id === '1') {
              return { ...conn, connected: microsoftConnected };
            } else if (conn.id === '4') {
              return { ...conn, connected: hasScreenTimePermission };
            } else 
            if (conn.id === '6') {
              return { ...conn, connected: hasCallLogPermission };
            } else if (conn.id === '7') {
              return { ...conn, connected: hasSleepPermission };
            }
            return conn;
          })
        );

        // No redirection on grant; keep user on current screen
      } else {
        // For iOS, still check Microsoft connection
        setConnections(prev =>
          prev.map(conn => {
            if (conn.id === '1') {
              return { ...conn, connected: microsoftConnected };
            }
            return conn;
          })
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
    if (id === '1') {
      const isConnected = connections.find(c => c.id === '1')?.connected;
      if (!isConnected) {
        const ok = await handleMicrosoftLogin();
        if (ok) {
          // Update both local state and shared storage
          setConnections(prev => prev.map(c => c.id === '1' ? { ...c, connected: true } : c));
          await setMicrosoftConnectionStatus(true);
          try {
            const me = await fetchMicrosoftMe();
            setMsProfileName(me?.displayName ?? null);
          } catch {}
        }
      } else {
        // For simplicity, just mark disconnected locally and in shared storage
        setConnections(prev => prev.map(c => c.id === '1' ? { ...c, connected: false } : c));
        await setMicrosoftConnectionStatus(false);
        setMsProfileName(null);
      }
      return;
    }

    // Handle call log permission
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

    // Handle sleep permission
    if (id === '7') {
      // Check if permission is already granted
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);

      if(hasPermission) {
        openAppSettings();
      }
      else {
          // Call the function to request permission
          const isGranted = await SleepService.requestPermission();

          // Update the state based on permission request
          setConnections(prev =>
              prev.map(conn =>
                conn.id === id ? { ...conn, connected: isGranted } : conn
              )
            );
      }
      return;
    }

    // Handle screen time permission
    if (id === '4') {
      // Check current permission status via native module
      const hasPermission = await ScreenTimeService.checkPermission();

      if (hasPermission) {
        openAppSettings();
      } else {
        // Request permission (opens settings); returns true only if already granted
        const isGranted = await ScreenTimeService.requestPermission();

        // Update state based on result
        setConnections(prev =>
          prev.map(conn => (conn.id === id ? { ...conn, connected: isGranted } : conn))
        );
      }
      return;
    }

    // Handle other connections (non-permission based)
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
          {msProfileName ? (
            <Text style={[styles.subtitle, { marginTop: 6 }]}>Microsoft: {msProfileName}</Text>
          ) : null}
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