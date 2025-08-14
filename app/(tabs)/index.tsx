import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { MoodCard } from '@/components/MoodCard';
import { StatsCard } from '@/components/StatsCard';
import { QuickActions } from '@/components/QuickActions';
import { Smile, Heart, Zap, Moon, Smartphone, DollarSign, LucideIcon } from 'lucide-react-native';

export default function DashboardScreen() {
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

  // Fetch mood data from your RoBERTa API
  useEffect(() => {
    const fetchMoodData = async () => {
      try {
        // For demo purposes, we'll use sample data
        // In production, you'd fetch from your API endpoint
        const sampleMoodData = {
          goals: ['Improve mental health', 'Better sleep'],
          concerns: ['Depression', 'Work stress']
        };

        // Call your RoBERTa API
        const response = await fetch('http://192.168.1.10:5001/generate-mood-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleMoodData),
        });

        if (response.ok) {
          const result = await response.json();
          setMoodScores(result.mood_scores || []);
          
          // Update current mood based on RoBERTa results
          if (result.mood_scores && result.mood_scores.length > 0) {
            const topEmotion = result.mood_scores[0];
            const newMood = {
              emoji: getEmojiForEmotion(topEmotion.emotion),
              label: getMoodLabel(topEmotion.emotion),
              level: getMoodLevel(result.mood_scores),
              date: new Date().toLocaleString()
            };
            setCurrentMood(newMood);
          }
        } else {
          console.log('Failed to fetch mood data');
        }
      } catch (error) {
        console.error('Error fetching mood data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodData();
  }, []);

  // Generate dynamic stats based on mood scores
  const getDynamicStats = () => {
    if (moodScores.length === 0) return [];
    
    const topEmotions = moodScores.slice(0, 5);
    
    return [
      {
        icon: Heart,
        title: 'Top Emotion',
        value: topEmotions[0]?.emotion || 'N/A',
        subtitle: `${Math.abs(topEmotions[0]?.confidence || 0).toFixed(2)} confidence`,
        color: '#EF4444',
        trend: 'up' as const
      },
      {
        icon: Zap,
        title: 'Emotional Balance',
        value: `${getMoodLevel(moodScores)}/10`,
        subtitle: 'Based on RoBERTa analysis',
        color: '#10B981',
        trend: 'stable' as const
      },
      {
        icon: Moon,
        title: 'Mood Stability',
        value: `${moodScores.length} emotions`,
        subtitle: 'Analyzed by AI model',
        color: '#8B5CF6',
        trend: 'up' as const
      },
      {
        icon: Smile,
        title: 'Wellness Score',
        value: `${Math.round((getMoodLevel(moodScores) / 10) * 100)}%`,
        subtitle: 'Overall emotional health',
        color: '#F59E0B',
        trend: 'up' as const
      }
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
          <MoodCard mood={currentMood} />
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Wellness Overview</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <StatsCard key={index} {...stat} />
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