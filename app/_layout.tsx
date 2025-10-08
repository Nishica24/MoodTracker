import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Ensure proper web initialization
      console.log('Web platform initialized');
    }
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" backgroundColor="transparent" translucent={false} />
      </SafeAreaProvider>
    </AuthProvider>
  );
}