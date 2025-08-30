import AsyncStorage from '@react-native-async-storage/async-storage';
import CallLog from 'react-native-call-log';
import { PermissionsAndroid } from 'react-native';

// --- Constants ---
const HISTORY_KEY = 'call_log_history';
const BASELINE_KEY = 'user_baseline'; // Key for storing the calculated baseline
const LAST_UPDATE_KEY = 'call_log_last_update';
const HISTORY_LENGTH = 365; // We will store the last 30 days of summaries
const MINIMUM_DAYS_FOR_BASELINE = 7;


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

export type Baseline = {
  avgOutgoing: number;
  avgIncoming: number;
  avgMissed: number;
  avgRejected: number;
  avgDuration: number;
  avgUniqueContacts: number
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
    console.log('Calling the updateUserBaseline function');
    await updateUserBaseline();

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


/**
 * ====================================================================
 * Helper Function: updateUserBaseline
 * ====================================================================
 * This function is called from the updateDailyHistory,
 * and updates & stores the user's baseline social activity.
 */

const updateUserBaseline = async (): Promise<void> => {
    try {
        const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
        const history: DailySummary[] = historyJson ? JSON.parse(historyJson) : [];

        if (history.length < MINIMUM_DAYS_FOR_BASELINE) {
            console.log('Not enough data to update baseline.');
            return;
        }

         // The reduce function now sums up ALL parameters.
            const totals = history.reduce((acc, day) => {
                acc.outgoing += day.outgoingCount;
                acc.incoming += day.incomingCount; // New
                acc.missed += day.missedCount;
                acc.rejected += day.rejectedCount; // New
                acc.duration += day.avgDuration;
                acc.uniqueContacts += day.uniqueContacts;
                return acc;
            }, { outgoing: 0, incoming: 0, missed: 0, rejected: 0, duration: 0, uniqueContacts: 0 });

            const numDays = history.length;

            // The final baseline object now includes averages for all fields.
            const baseline: Baseline = {
                avgOutgoing: totals.outgoing / numDays,
                avgIncoming: totals.incoming / numDays, // New
                avgMissed: totals.missed / numDays,
                avgRejected: totals.rejected / numDays, // New
                avgDuration: totals.duration / numDays,
                avgUniqueContacts: totals.uniqueContacts / numDays,
            };

        await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
        console.log('User baseline has been automatically updated.');

    } catch (error) {
        console.error('Failed to auto-update user baseline:', error);
    }
};