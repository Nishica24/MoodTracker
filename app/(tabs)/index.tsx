import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { MoodCard } from '@/components/MoodCard';
import { StatsCard } from '@/components/StatsCard';
import { QuickActions } from '@/components/QuickActions';
import { Smile, Heart, Zap, Moon, Smartphone, DollarSign, LucideIcon } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router'

export default function DashboardScreen() {

   const { formData } = useLocalSearchParams();

   const parsedFormData = JSON.parse(formData as string);

  const [currentMood, setCurrentMood] = useState({
    emoji: '😊',
    label: 'Happy',
    level: 7,
    date: 'Today, 2:30 PM'
  });
  
  const [moodScores, setMoodScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to get emoji based on top emotion
  const getEmojiForEmotion = (emotion: string) => {
    const emojiMap: { [key: string]: string } = {
      'joy': '😊',
      'happiness': '😄',
      'optimism': '😌',
      'love': '🥰',
      'gratitude': '🙏',
      'excitement': '🤩',
      'pride': '😎',
      'relief': '😌',
      'sadness': '😢',
      'fear': '😨',
      'anger': '😠',
      'anxiety': '😰',
      'stress': '😰',
      'depression': '😔',
      'grief': '😭',
      'neutral': '😐',
      'confusion': '😕',
      'surprise': '😲',
      'disappointment': '😞',
      'nervousness': '😬'
    };
    return emojiMap[emotion.toLowerCase()] || '😊';
  };

  // Function to get mood level from confidence scores
  const getMoodLevel = (scores: any[]) => {

    console.log('getMoodLevel:', scores)
    
    if (scores.length === 0) return 5;
    
    // Get the top emotion score and convert to 1-10 scale
    const topScore = scores[0];
    const confidence = Math.abs(topScore.confidence);
    
    // Convert confidence to mood level (1-10)
    // Higher confidence = higher mood level
    if (topScore.confidence > 0) {
      return Math.min(10, Math.max(1, Math.round(confidence * 10)));
    } else {
      return Math.min(10, Math.max(1, Math.round((1 - confidence) * 5)));
    }
  };

  // Function to get mood label from top emotion
  const getMoodLabel = (emotion: string) => {

    console.log('getMoodLabel:', emotion)

    const labelMap: { [key: string]: string } = {
      'joy': 'Joyful',
      'happiness': 'Happy',
      'optimism': 'Optimistic',
      'love': 'Loving',
      'gratitude': 'Grateful',
      'excitement': 'Excited',
      'pride': 'Proud',
      'relief': 'Relieved',
      'sadness': 'Sad',
      'fear': 'Fearful',
      'anger': 'Angry',
      'anxiety': 'Anxious',
      'stress': 'Stressed',
      'depression': 'Depressed',
      'grief': 'Grieving',
      'neutral': 'Neutral',
      'confusion': 'Confused',
      'surprise': 'Surprised',
      'disappointment': 'Disappointed',
      'nervousness': 'Nervous'
    };
    return labelMap[emotion.toLowerCase()] || 'Balanced';
  };

  // ✅ use passed data instead of fetching
  useEffect(() => {
    if (parsedFormData && parsedFormData.mood_scores) {
      setMoodScores(parsedFormData.mood_scores);

      const topEmotion = parsedFormData.mood_scores[0];
      if (topEmotion) {
        setCurrentMood({
          emoji: getEmojiForEmotion(topEmotion.emotion),
          label: getMoodLabel(topEmotion.emotion),
          level: getMoodLevel(parsedFormData.mood_scores),
          date: new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
        });
      }
    }
  }, [parsedFormData]);

  
  // Generate dynamic stats based on mood scores
  const getDynamicStats = (): Array<{
    icon: LucideIcon;
    title: string;
    value: string;
    subtitle: string;
    color: string;
    trend: 'up' | 'stable' | 'down';
    onPress?: () => void;
  }> => {
    if (moodScores.length === 0) return [];
    
    const topEmotions = moodScores.slice(0, 5);
    
    return [
      {
        icon: Heart,
        title: 'Social Health',
        value: '8.2',
        subtitle: '+0.5 from last week',
        color: '#EF4444',
        trend: 'up',
        onPress: () => router.push('./social-health')
      },
      {
        icon: DollarSign,
        title: 'Spending Wellness',
        value: '$247',
        subtitle: 'This week',
        color: '#10B981',
        trend: 'stable',
        onPress: () => router.push('./spending-wellness')
      },
      {
        icon: Zap,
        title: 'Work Stress',
        value: '4.2/10',
        subtitle: 'Moderate level',
        color: '#F59E0B',
        trend: 'down',
        onPress: () => router.push('./work-stress')
      },
      {
        icon: Moon,
        title: 'Sleep Quality',
        value: '7.5h',
        subtitle: 'Avg this week',
        color: '#8B5CF6',
        trend: 'up',
        onPress: () => router.push('./sleep-quality')
      },
      {
        icon: Smartphone,
        title: 'Screen Time',
        value: '4.2h',
        subtitle: 'Today',
        color: '#06B6D4',
        trend: 'down',
        onPress: () => router.push('./screen-time')
      },
    ];
  };

  const stats = getDynamicStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good afternoon!</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>

        <View style={styles.content}>
          <MoodCard mood={currentMood}/>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Wellness Overview</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <StatsCard key={index} {...stat} onPress={stat.onPress} />
              ))}
            </View>
          </View>

          <QuickActions />
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
  greeting: {
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
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  statsGrid: {
    gap: 12,
  },
});