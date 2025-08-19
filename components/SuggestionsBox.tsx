import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lightbulb, ArrowRight } from 'lucide-react-native';

interface SuggestionsBoxProps {
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    category: 'social' | 'communication' | 'activities';
  }>;
}

export function SuggestionsBox({ suggestions }: SuggestionsBoxProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb size={24} color="#F59E0B" />
        <Text style={styles.title}>Improvement Suggestions</Text>
      </View>
      
      <View style={styles.suggestionsContainer}>
        {suggestions.map((suggestion) => (
          <TouchableOpacity key={suggestion.id} style={styles.suggestionItem}>
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
            </View>
            <ArrowRight size={16} color="#6B7280" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  suggestionsContainer: {
    gap: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  suggestionContent: {
    flex: 1,
    gap: 4,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  suggestionDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
