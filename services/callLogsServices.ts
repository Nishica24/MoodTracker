import AsyncStorage from '@react-native-async-storage/async-storage';
import CallLog from 'react-native-call-log';
import { PermissionsAndroid } from 'react-native';

// --- Constants ---
const HISTORY_KEY = 'call_log_history';
const HISTORY_LENGTH = 30; // We will store the last 30 days of summaries

// --- Type Definition ---
// A blueprint for the daily summary object we will store.
type DailySummary = {
  date: string; // "YYYY-MM-DD"
  outgoingCount: number;
  incomingCount: number;
  missedCount: number;
  rejectedCount: number;
  avgDuration: number; // Average duration in seconds
  uniqueContacts: number; // Count of unique numbers contacted
};

/**
 * ====================================================================
 * Main Function: updateDailyHistory
 * ====================================================================
 * This is the primary function you'll call. It orchestrates the
 * fetching, processing, and storing of the daily call log summary.
 */
export const updateDailyHistory = async (): Promise<void> => {
  console.log('Starting daily history update...');
  try {
    // Step 1: Get today's processed summary data.
    const newDailySummary = await getAndProcessTodaysData();

    if (!newDailySummary) {
      console.log('Could not generate daily summary. Aborting update.');
      return;
    }

    // Step 2: Retrieve the existing history from storage.
    const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
    let history: DailySummary[] = historyJson ? JSON.parse(historyJson) : [];

    // Step 3: Add the new summary and manage the history list.
    // Remove any existing entry for today to prevent duplicates.
    history = history.filter(day => day.date !== newDailySummary.date);

    // Add the new summary to the beginning of the array.
    history.unshift(newDailySummary);

    // Ensure the history does not exceed the desired length.
    if (history.length > HISTORY_LENGTH) {
      history = history.slice(0, HISTORY_LENGTH);
    }

    // Step 4: Save the updated history back to storage.
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    console.log('Successfully updated call log history. Current history:', history);

  } catch (error) {
    console.error('An error occurred during updateDailyHistory:', error);
  }
};


/**
 * ====================================================================
 * Helper Function: getAndProcessTodaysData
 * ====================================================================
 * This function handles the "dirty work": fetching raw logs and
 * transforming them into a clean DailySummary object.
 */
const getAndProcessTodaysData = async (): Promise<DailySummary | null> => {
  const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
  if (!hasPermission) {
    console.warn('Permission denied. Cannot fetch call logs.');
    return null;
  }

  // --- Fetching ---
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rawLogs = await CallLog.load(-1, { minTimestamp: startOfDay.getTime() });

  if (!rawLogs || rawLogs.length === 0) {
    console.log('No call logs found for today.');
    // Return a zeroed-out summary for days with no activity
    return {
      date: new Date().toISOString().split('T')[0],
      outgoingCount: 0,
      incomingCount: 0,
      missedCount: 0,
      rejectedCount: 0,
      avgDuration: 0,
      uniqueContacts: 0,
    };
  }

  // --- Processing ---
  let totalDuration = 0;
  let answeredCallCount = 0;
  const uniqueNumbers = new Set<string>();

  const summary: Omit<DailySummary, 'date' | 'avgDuration' | 'uniqueContacts'> = {
    outgoingCount: 0,
    incomingCount: 0,
    missedCount: 0,
    rejectedCount: 0,
  };

  for (const log of rawLogs) {
    uniqueNumbers.add(log.phoneNumber);

    switch (log.type) {
      case 'OUTGOING':
        summary.outgoingCount++;
        totalDuration += log.duration;
        answeredCallCount++;
        break;
      case 'INCOMING':
        summary.incomingCount++;
        totalDuration += log.duration;
        answeredCallCount++;
        break;
      case 'MISSED':
        summary.missedCount++;
        break;
      case 'REJECTED': // Assuming the library supports this, otherwise it falls under MISSED
        summary.rejectedCount++;
        break;
    }
  }

  // --- Final Calculation ---
  const avgDuration = answeredCallCount > 0 ? Math.round(totalDuration / answeredCallCount) : 0;

  return {
    ...summary,
    date: new Date().toISOString().split('T')[0],
    avgDuration: avgDuration,
    uniqueContacts: uniqueNumbers.size,
  };
};