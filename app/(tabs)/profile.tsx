import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { User, Bell, Shield, CircleHelp as HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { userService, UserData, UserStats } from '../../services/userService';
import { authService } from '../../services/authService';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Load comprehensive profile data from backend (includes user data and stats)
      const profileData = await userService.getUserData();
      
      if (profileData) {
        setUserData(profileData);
        
        // Extract stats from the comprehensive profile response
        // The backend now returns stats as part of the profile data
        const statsData = await userService.getUserStats();
        if (statsData) {
          setUserStats(statsData);
        } else {
          // Fallback to basic stats
          console.log('🔍 DEBUG: Stats fetch failed, using fallback');
          const fallbackStats = await userService.getFallbackStats();
          setUserStats(fallbackStats);
        }
      } else {
        // Fallback to basic user data from local storage
        console.log('🔍 DEBUG: Backend fetch failed, using fallback');
        const fallbackData = await userService.getFallbackUserData();
        setUserData(fallbackData);
        
        // Set fallback stats
        const fallbackStats = await userService.getFallbackStats();
        setUserStats(fallbackStats);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Set fallback data
      const fallbackData = await userService.getFallbackUserData();
      const fallbackStats = await userService.getFallbackStats();
      setUserData(fallbackData);
      setUserStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔍 DEBUG: User initiated sign out');
              
              // Clear all authentication data
              await authService.logout();
              
              console.log('🔍 DEBUG: Authentication data cleared');
              
              // Clear local state
              setUserData(null);
              setUserStats(null);
              
              // Redirect to login page
              router.replace('/(auth)/login');
              
              console.log('🔍 DEBUG: Redirected to login page');
            } catch (error) {
              console.error('Error during sign out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Manage your alerts and reminders',
      color: '#6366F1'
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      subtitle: 'Control your data and privacy settings',
      color: '#10B981'
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      color: '#F59E0B'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatar}>
                  <User size={32} color="white" />
                </View>
                <Text style={styles.name}>
                  {userData?.name || 'Loading...'}
                </Text>
                <Text style={styles.email}>
                  {userData?.email || 'Loading...'}
                </Text>
                <Text style={styles.joinDate}>
                  Member since {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
                </Text>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {userStats?.days_tracked || 0}
                  </Text>
                  <Text style={styles.statLabel}>Days tracked</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {userStats?.avg_mood || 0}
                  </Text>
                  <Text style={styles.statLabel}>Avg mood</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {userStats?.connected_apps || 0}
                  </Text>
                  <Text style={styles.statLabel}>Apps connected</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                  <item.icon size={20} color="white" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
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
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
  },
  joinDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  menuSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});