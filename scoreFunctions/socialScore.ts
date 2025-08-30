import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailySummary, Baseline } from '@/services/callLogsServices'; // Adjust path

const HISTORY_KEY = 'call_log_history';
const BASELINE_KEY = 'user_baseline';

/**
 * Calculates the final social score by comparing today's data to the stored baseline.
 * @returns {Promise<number>} - A score from 0 to 10.
 */
export const calculateSocialScore = async (): Promise<number> => {
    try {
        const baselineJson = await AsyncStorage.getItem(BASELINE_KEY);
        const historyJson = await AsyncStorage.getItem(HISTORY_KEY);

        if (!baselineJson || !historyJson) return 5.0; // Return neutral score

        const baseline: Baseline = JSON.parse(baselineJson);
        const history: DailySummary[] = JSON.parse(historyJson);
        const todaySummary = history[0];

        if (!todaySummary) return 5.0;

        // --- Scoring Logic ---

        // --- Step 1: Calculate the Raw, Unbounded Score ---
        let score = 5.0; // Start with a neutral score of 5 out of 10.

        // --- Factor 1: Proactive Social Engagement (Weight: High Positive) ---
        // Outgoing calls are a strong indicator of proactive social health.
        const outgoingDiff = todaySummary.outgoingCount - baseline.avgOutgoing;
        score += (outgoingDiff * 0.75);

        // --- Factor 2: Receptiveness to Contact (Weight: Medium Positive) ---
        // Answering incoming calls is good, but less proactive than making them.
        const incomingDiff = todaySummary.incomingCount - baseline.avgIncoming;
        score += (incomingDiff * 0.4);

        // --- Factor 3: Conversation Depth (Weight: Medium Positive) ---
        // Longer conversations suggest more meaningful interactions.
        const durationDiff = todaySummary.avgDuration - baseline.avgDuration;
        // Every 60-second increase/decrease in avg duration adjusts the score by ~0.4 points.
        score += (durationDiff / 150);

        // --- Factor 4: Social Circle Breadth (Weight: Medium Positive) ---
        // Interacting with more unique contacts is a positive sign.
        const uniqueContactsDiff = todaySummary.uniqueContacts - baseline.avgUniqueContacts;
        score += (uniqueContactsDiff * 0.5);

        // --- Factor 5: Social Avoidance (Weight: High Negative) ---
        // Missing calls is a strong negative indicator.
        const missedDiff = todaySummary.missedCount - baseline.avgMissed;
        score -= (missedDiff * 1.0);

        // --- Factor 6: Active Rejection (Weight: Very High Negative) ---
        // Actively rejecting calls is an even stronger signal of being overwhelmed or avoidant.
        const rejectedDiff = todaySummary.rejectedCount - baseline.avgRejected;
        score -= (rejectedDiff * 1.5);

        // --- Step 2: Estimate the User's Plausible Score Range ---
        // What would a "great" day look like vs a "bad" day?
        // We'll estimate this by assuming key metrics swing by a certain amount.
        // For example, a great day might have double the outgoing calls and zero missed calls.
        const bestCase = 5.0 + (baseline.avgOutgoing * 0.75) + (baseline.avgIncoming * 0.4) + (baseline.avgUniqueContacts * 0.5);
        const worstCase = 5.0 - (baseline.avgOutgoing * 0.75) - (baseline.avgMissed * 1.0) - (baseline.avgRejected * 1.5);

        // --- Step 3: Normalize the Raw Score ---
        const finalScore = normalize(rawScore, worstCase, bestCase);

        return parseFloat(finalScore.toFixed(1));


    } catch (error) {
        console.error('Failed to calculate score:', error);
        return 5.0; // Return neutral score on error
    }
};


/**
 * Normalizes a value from one range to another (e.g., -5 to 15 -> 0 to 10).
 * @param value The raw score to be scaled.
 * @param min The minimum possible raw score.
 * @param max The maximum possible raw score.
 * @returns {number} The scaled score between 0 and 10.
 */
const normalize = (value: number, min: number, max: number): number => {
    // If the potential range is zero, return a neutral score
    if (max - min === 0) {
        return 5.0;
    }
    // Scale the value to a 0-1 range, then multiply by 10
    const scaledValue = ((value - min) / (max - min)) * 10;
    // Clamp the final value to ensure it's strictly between 0 and 10
    return Math.max(0, Math.min(10, scaledValue));
};