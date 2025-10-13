import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailySummary, Baseline } from '../services/callLogsServices'; // Adjust path

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

        console.log('🔍 DEBUG: Social score calculation - baseline exists:', !!baselineJson);
        console.log('🔍 DEBUG: Social score calculation - history exists:', !!historyJson);

        if (!baselineJson || !historyJson) {
            console.log('Baseline or history not found, returning neutral score.');
            return 5.0; // Return neutral score
        }

        const baseline: Baseline = JSON.parse(baselineJson);
        const history: DailySummary[] = JSON.parse(historyJson);

        console.log('🔍 DEBUG: Baseline data:', baseline);
        console.log('🔍 DEBUG: History length:', history.length);

        // Ensure history is not empty and today's summary is present
        if (history.length === 0) {
            console.log('History is empty, returning neutral score.');
            return 5.0;
        }
        const todaySummary = history[0];
        console.log('🔍 DEBUG: Today summary:', todaySummary);

        // --- Scoring Logic ---

        // --- Step 1: Calculate the Raw, Unbounded Score ---
        let score = 5.0; // Start with a neutral score of 5 out of 10.

        // --- Factor 1: Proactive Social Engagement (Weight: High Positive) ---
        const outgoingDiff = todaySummary.outgoingCount - baseline.avgOutgoing;
        score += (outgoingDiff * 0.75);

        // --- Factor 2: Receptiveness to Contact (Weight: Medium Positive) ---
        const incomingDiff = todaySummary.incomingCount - baseline.avgIncoming;
        score += (incomingDiff * 0.4);

        // --- Factor 3: Conversation Depth (Weight: Medium Positive) ---
        const durationDiff = todaySummary.avgDuration - baseline.avgDuration;
        score += (durationDiff / 150);

        // --- Factor 4: Social Circle Breadth (Weight: Medium Positive) ---
        const uniqueContactsDiff = todaySummary.uniqueContacts - baseline.avgUniqueContacts;
        score += (uniqueContactsDiff * 0.5);

        // --- Factor 5: Social Avoidance (Weight: High Negative) ---
        const missedDiff = todaySummary.missedCount - baseline.avgMissed;
        score -= (missedDiff * 1.0);

        // --- Factor 6: Active Rejection (Weight: Very High Negative) ---
        const rejectedDiff = todaySummary.rejectedCount - baseline.avgRejected;
        score -= (rejectedDiff * 1.5);

        console.log('🔍 DEBUG: Raw score calculation:', {
            outgoingDiff, incomingDiff, durationDiff, uniqueContactsDiff, missedDiff, rejectedDiff, rawScore: score
        });

        // --- Step 2: Estimate the User's Plausible Score Range ---
        const bestCase = 5.0 + (baseline.avgOutgoing * 0.75) + (baseline.avgIncoming * 0.4) + (baseline.avgUniqueContacts * 0.5);
        const worstCase = 5.0 - (baseline.avgOutgoing * 0.75) - (baseline.avgMissed * 1.0) - (baseline.avgRejected * 1.5);

        console.log('🔍 DEBUG: Score range:', { bestCase, worstCase });

        // --- Step 3: Normalize the Raw Score ---
        // Handle edge case where bestCase and worstCase are the same (no variation in baseline)
        let finalScore;
        if (Math.abs(bestCase - worstCase) < 0.1) {
            // If there's no meaningful variation in baseline, use a simple mapping
            // Map raw score to 0-10 range more directly
            finalScore = Math.max(0, Math.min(10, score));
            console.log('🔍 DEBUG: Using direct mapping due to no baseline variation');
        } else {
            finalScore = normalize(score, worstCase, bestCase);
        }

        console.log(`Raw Score: ${score.toFixed(2)}, Normalized Score: ${finalScore.toFixed(1)}`);
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
    if (max - min === 0) {
        return 5.0;
    }
    const scaledValue = ((value - min) / (max - min)) * 10;
    return Math.max(0, Math.min(10, scaledValue));
};

/**
 * Fetches historical social scores for a given period
 * @param period - 'week', 'month', or 'quarter'
 * @returns Array of social scores with dates
 */
export const getHistoricalSocialScores = async (period: string): Promise<Array<{date: string, score: number}>> => {
    try {
        const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
        const baselineJson = await AsyncStorage.getItem(BASELINE_KEY);

        if (!historyJson || !baselineJson) {
            console.log('No history or baseline data found');
            return [];
        }

        const history: DailySummary[] = JSON.parse(historyJson);
        const baseline: Baseline = JSON.parse(baselineJson);

        // Filter data based on period
        const now = new Date();
        let daysToFetch = 7; // Default to week
        
        switch (period) {
            case 'week':
                daysToFetch = 7;
                break;
            case 'month':
                daysToFetch = 30;
                break;
            case 'quarter':
                daysToFetch = 90;
                break;
        }

        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - daysToFetch);
        const cutoffDateString = cutoffDate.toISOString().split('T')[0];

        // Filter history to the requested period
        const filteredHistory = history.filter(day => day.date >= cutoffDateString);

        // Calculate social scores for each day
        const socialScores = filteredHistory.map(day => {
            let score = 5.0; // Start with neutral score

            // Apply the same scoring logic as calculateSocialScore
            const outgoingDiff = day.outgoingCount - baseline.avgOutgoing;
            score += (outgoingDiff * 0.75);

            const incomingDiff = day.incomingCount - baseline.avgIncoming;
            score += (incomingDiff * 0.4);

            const durationDiff = day.avgDuration - baseline.avgDuration;
            score += (durationDiff / 150);

            const uniqueContactsDiff = day.uniqueContacts - baseline.avgUniqueContacts;
            score += (uniqueContactsDiff * 0.5);

            const missedDiff = day.missedCount - baseline.avgMissed;
            score -= (missedDiff * 1.0);

            const rejectedDiff = day.rejectedCount - baseline.avgRejected;
            score -= (rejectedDiff * 1.5);

            // Normalize the score
            const bestCase = 5.0 + (baseline.avgOutgoing * 0.75) + (baseline.avgIncoming * 0.4) + (baseline.avgUniqueContacts * 0.5);
            const worstCase = 5.0 - (baseline.avgOutgoing * 0.75) - (baseline.avgMissed * 1.0) - (baseline.avgRejected * 1.5);
            const normalizedScore = normalize(score, worstCase, bestCase);

            return {
                date: day.date,
                score: parseFloat(normalizedScore.toFixed(1))
            };
        });

        // Sort by date (oldest first for chart display)
        return socialScores.sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
        console.error('Failed to fetch historical social scores:', error);
        return [];
    }
};