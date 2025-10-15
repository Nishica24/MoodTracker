import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
      const { isAuthenticated, isLoading, userProfile } = useAuth();

//   console.log('🔍 DEBUG: Index component render');
  console.log(`🔍 DEBUG: isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);
  console.log(`🔍 DEBUG: userProfile:`, userProfile);

  // Show loading spinner while checking auth status
  if (isLoading) {
    console.log('🔍 DEBUG: Showing loading spinner');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // If authenticated and onboarding complete, go to dashboard
  if (isAuthenticated && userProfile?.onboarding_complete) {
    console.log('🔍 DEBUG: Redirecting to dashboard (authenticated + onboarding complete)');
    return <Redirect href="/(tabs)" />;
  }

  // If authenticated but onboarding not complete, go to onboarding
  if (isAuthenticated && !userProfile?.onboarding_complete) {
    console.log('🔍 DEBUG: Redirecting to onboarding (authenticated but onboarding incomplete)');
    return <Redirect href="/(auth)/onboarding" />;
  }

  // If not authenticated, go to login
  console.log('🔍 DEBUG: Redirecting to login (not authenticated)');
  return <Redirect href="/(auth)/login" />;
}