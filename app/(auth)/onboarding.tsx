import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, ArrowRight, User, Target, Activity } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DEFAULT_USER_PROFILE } from '@/utils/userProfile';
import { useAuth } from '../../hooks/useAuth';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const insets = useSafeAreaInsets();
  const { user, refreshUserProfile } = useAuth();

  type FormData = {
    user_id: string;
    name: string;
    age: string;
    goals: string[];
    concerns: string[];
  };

  const [formData, setFormData] = useState<FormData>({
    user_id: '',
    name: '',
    age: '',
    goals: [],
    concerns: [],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, user_id: user.id }));
    }
  }, [user]);

  // Goals & Concerns (frontend wording kept same, backend handles normalization)
  const goals = [
    'Improve mental health',
    'Better sleep',
    'Reduce stress',
    'Track habits',
    'Social wellness',
    'Work-life balance'
  ];

  const concerns = [
    'Anxiety',
    'Depression',
    'Sleep issues',
    'Work stress',
    'Social isolation',
    'Screen addiction'
  ];

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal) 
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const handleConcernToggle = (concern: string) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }));
  };

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (stepNumber === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      if (!formData.age.trim()) {
        newErrors.age = 'Age is required';
      } else {
        const ageNum = parseInt(formData.age);
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
          newErrors.age = 'Please enter a valid age (13-120)';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveUserProfile = async (formData: FormData) => {
    try {
      const age = parseInt(formData.age);
      const role: 'student' | 'working_adult' | 'professional' =
        age < 25 ? 'student' : age < 45 ? 'working_adult' : 'professional';

      const userProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        name: formData.name.trim(),
        age: age,
        role: role,
        preferences: {
          ...DEFAULT_USER_PROFILE.preferences,
          // Map goals to preferences if needed
          focusMode: formData.goals.includes('Work-life balance')
        }
      };

      // Save user profile for scoring system
      await AsyncStorage.setItem('user_profile', JSON.stringify(userProfile));

      // Save complete onboarding data for future reference
      const onboardingData = {
        user_id: formData.user_id,
        name: formData.name.trim(),
        age: age,
        goals: formData.goals,
        concerns: formData.concerns,
        completedAt: new Date().toISOString(),
        // Additional metadata
        userProfile: userProfile
      };

      await AsyncStorage.setItem('onboarding_data', JSON.stringify(onboardingData));

      // Also save user name separately for easy access
      await AsyncStorage.setItem('user_name', formData.name.trim());

      console.log('User profile saved:', userProfile);
      console.log('Complete onboarding data saved:', onboardingData);
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    if (step === 1 && !validateStep(1)) {
      return; // Don't proceed if validation fails
    }

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (step === 3) {
      setIsLoading(true);

      try {
        console.log('Submitting formData: ', formData);

        // Save user profile to AsyncStorage for scoring system
        await saveUserProfile(formData);

        // IMPORTANT: change 10.0.2.2 to your IP if testing on device
        const response = await fetch('http://localhost:5000/generate-mood-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Backend error");

        const result = await response.json();
        console.log('API result', result);

        // Refresh user profile to mark onboarding as complete
        await refreshUserProfile();

        router.push({
          pathname: '/(tabs)',
          params: { result: JSON.stringify(result) }
        });

      } catch (error: any) {
        console.error(error);
        Alert.alert("Error", "Could not connect to backend. Check network/IP.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Step renderers
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <User size={48} color="#6366F1" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>Help us personalize your experience</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>What's your name?</Text>
        <TextInput
          style={[
            styles.textInput,
            errors.name && styles.textInputError
          ]}
          placeholder="Enter your name"
          placeholderTextColor="#9CA3AF"
          value={formData.name}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, name: text }));
            // Clear error when user starts typing
            if (errors.name) {
              setErrors(prev => ({ ...prev, name: '' }));
            }
          }}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your age</Text>
        <TextInput
          style={[
            styles.textInput,
            errors.age && styles.textInputError
          ]}
          placeholder="Enter your age"
          placeholderTextColor="#9CA3AF"
          value={formData.age}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, age: text }));
            // Clear error when user starts typing
            if (errors.age) {
              setErrors(prev => ({ ...prev, age: '' }));
            }
          }}
          keyboardType="numeric"
        />
        {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
        <Text style={styles.helperText}>This helps us customize your mood scoring</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Target size={48} color="#6366F1" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>What are your goals?</Text>
      <Text style={styles.stepSubtitle}>Select all that apply to you</Text>

      <View style={styles.optionsContainer}>
        {goals.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[
              styles.optionButton,
              formData.goals.includes(goal) && styles.optionButtonSelected
            ]}
            onPress={() => handleGoalToggle(goal)}
          >
            <Text style={[
              styles.optionText,
              formData.goals.includes(goal) && styles.optionTextSelected
            ]}>
              {goal}
            </Text>
            {formData.goals.includes(goal) && (
              <CheckCircle size={20} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Activity size={48} color="#6366F1" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Any specific concerns?</Text>
      <Text style={styles.stepSubtitle}>This helps us provide better insights</Text>

      <View style={styles.optionsContainer}>
        {concerns.map((concern) => (
          <TouchableOpacity
            key={concern}
            style={[
              styles.optionButton,
              formData.concerns.includes(concern) && styles.optionButtonSelected
            ]}
            onPress={() => handleConcernToggle(concern)}
          >
            <Text style={[
              styles.optionText,
              formData.concerns.includes(concern) && styles.optionTextSelected
            ]}>
              {concern}
            </Text>
            {formData.concerns.includes(concern) && (
              <CheckCircle size={20} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.progressContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {step} of 3</Text>
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <TouchableOpacity 
          style={[styles.nextButton, isLoading && styles.buttonDisabled]} 
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {isLoading ? 'Generating...' : (step === 3 ? 'Complete Setup' : 'Continue')}
          </Text>
          {!isLoading && <ArrowRight size={20} color="white" />}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  buttonDisabled: { opacity: 0.6 },
  scrollView: { flex: 1 },
  progressContainer: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366F1' },
  progressText: { textAlign: 'center', marginTop: 8, fontSize: 14, color: '#6B7280' },
  stepContent: { paddingHorizontal: 24, alignItems: 'center' },
  stepIcon: { marginBottom: 24 },
  stepTitle: { fontSize: 28, fontWeight: '700', color: '#000000', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#374151', textAlign: 'center', marginBottom: 32 },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 8 },
  textInput: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', color: '#000000' },
  textInputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 14, marginTop: 4 },
  helperText: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  optionsContainer: { width: '100%', gap: 12 },
  optionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  optionButtonSelected: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  optionText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  optionTextSelected: { color: 'white' },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 16, marginHorizontal: 24, marginTop: 32, marginBottom: 24, gap: 8 },
  nextButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});