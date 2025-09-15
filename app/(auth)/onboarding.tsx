import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { CircleCheck as CheckCircle, ArrowRight, User, Target, Activity } from 'lucide-react-native';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);

  type FormData = {
    user_id: number;
    name: string;
    age: string;
    goals: string[];
    concerns: string[];
  };

  const [formData, setFormData] = useState<FormData>({
    user_id: 123,
    name: '',
    age: '',
    goals: [],
    concerns: [],
  });

  const [isLoading, setIsLoading] = useState(false);

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

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (step === 3) {
      setIsLoading(true);

      try {
        console.log('Submitting formData: ', formData);

        // IMPORTANT: change 10.0.2.2 to your IP if testing on device
        const response = await fetch('http://192.168.56.1:5000/generate-mood-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Backend error");

        const result = await response.json();
        console.log('API result', result);

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
          style={styles.textInput}
          placeholder="Enter your name"
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your age</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your age"
          value={formData.age}
          onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
          keyboardType="numeric"
        />
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
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
  stepTitle: { fontSize: 28, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textInput: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  optionsContainer: { width: '100%', gap: 12 },
  optionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  optionButtonSelected: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  optionText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  optionTextSelected: { color: 'white' },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 16, marginHorizontal: 24, marginTop: 32, marginBottom: 24, gap: 8 },
  nextButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});