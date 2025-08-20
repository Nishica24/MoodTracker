import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function Dashboard() {
  const { result } = useLocalSearchParams();
  const data = result ? JSON.parse(result as string) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Mood Analysis</Text>
      {data ? (
        <>
          <Text style={styles.moodText}>
            Mood: {data.mood} {data.emoji}
          </Text>
          <Text style={styles.detail}>Mood Level: {data.mood_level}</Text>
          <Text style={styles.detail}>Timestamp: {data.timestamp}</Text>
        </>
      ) : (
        <Text>No data received</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  moodText: { fontSize: 20, fontWeight: "600", marginBottom: 10 },
  detail: { fontSize: 16, color: "#555" },
});