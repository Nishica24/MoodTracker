import AsyncStorage from '@react-native-async-storage/async-storage';
import CallLog from 'react-native-call-log';
import { PermissionsAndroid } from 'react-native';

// --- Constants ---
const HISTORY_KEY = 'call_log_history';
const BASELINE_KEY = 'user_baseline';
const LAST_UPDATE_KEY = 'call_log_last_update';
const HISTORY_LENGTH = 365;
const MINIMUM_DAYS_FOR_BASELINE = 7;

// --- Type Definitions (unchanged) ---
type DailySummary = {
  date: string;
  outgoingCount: number;
  incomingCount: number;
  missedCount: number;
  rejectedCount: number;
  avgDuration: number;
  uniqueContacts: number;
};
export type Baseline = {
  avgOutgoing: number;
  avgIncoming: number;
  avgMissed: number;
  avgRejected: number;
  avgDuration: number;
  avgUniqueContacts: number;
};

// --- Helper Function (unchanged) ---
const processLogsByDay = (logs: CallLog.CallLog[]): DailySummary[] => {
  if (!logs || logs.length === 0) {
    return [];
  }
  const dailyDataMap = new Map<string, {
    totalDuration: number;
    answeredCallCount: number;
    uniqueNumbers: Set<string>;
    summary: Omit<DailySummary, 'date' | 'avgDuration' | 'uniqueContacts'>;
  }>();

  for (const log of logs) {
    let numericTimestamp: number | undefined;
    if (typeof log.timestamp === 'string') {
      numericTimestamp = parseInt(log.timestamp, 10);
    } else if (typeof log.timestamp === 'number') {
      numericTimestamp = log.timestamp;
    }

    if (numericTimestamp === undefined || !isFinite(numericTimestamp)) {
      console.warn('Skipping a call log with an invalid or unparsable timestamp:', log);
      continue;
    }

    const date = new Date(numericTimestamp).toISOString().split('T')[0];
    if (!dailyDataMap.has(date)) {
      dailyDataMap.set(date, {
        totalDuration: 0,
        answeredCallCount: 0,
        uniqueNumbers: new Set<string>(),
        summary: { outgoingCount: 0, incomingCount: 0, missedCount: 0, rejectedCount: 0 },
      });
    }
    const dayData = dailyDataMap.get(date)!;
    dayData.uniqueNumbers.add(log.phoneNumber);
    switch (log.type) {
      case 'OUTGOING':
      case 'INCOMING':
        dayData.summary[log.type === 'OUTGOING' ? 'outgoingCount' : 'incomingCount']++;
        dayData.totalDuration += log.duration;
        dayData.answeredCallCount++;
        break;
      case 'MISSED':
        dayData.summary.missedCount++;
        break;
      case 'REJECTED':
        dayData.summary.rejectedCount++;
        break;
    }
  }
  const processedSummaries: DailySummary[] = [];
  for (const [date, data] of dailyDataMap.entries()) {
    const avgDuration = data.answeredCallCount > 0 ? Math.round(data.totalDuration / data.answeredCallCount) : 0;
    processedSummaries.push({
      ...data.summary,
      date: date,
      avgDuration: avgDuration,
      uniqueContacts: data.uniqueNumbers.size,
    });
  }
  return processedSummaries.sort((a, b) => b.date.localeCompare(a.date));
};

// --- CORRECTED "SMART CONTROLLER" MAIN FUNCTION ---
export const updateDailyHistory = async (): Promise<void> => {
  console.log('Starting smart history update...');
  try {
    const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
    let history: DailySummary[] = historyJson ? JSON.parse(historyJson) : [];

    const lastUpdateDateString = await AsyncStorage.getItem(LAST_UPDATE_KEY);
    const todayDateString = new Date().toISOString().split('T')[0];

    // CASE 1: New User OR Inconsistent State
    if (history.length === 0 || !lastUpdateDateString) {
      console.log('CASE 1: No/incomplete history found. Performing initial 7-day back-fill.');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - MINIMUM_DAYS_FOR_BASELINE);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const logsToProcess = await CallLog.load(-1, { minTimestamp: sevenDaysAgo.getTime() });
      history = processLogsByDay(logsToProcess);

    // CASE 2: Regular User (already updated today)
    } else if (lastUpdateDateString === todayDateString) {
      console.log('CASE 2: Already updated today. Refreshing today\'s data only.');
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const logsToProcess = await CallLog.load(-1, { minTimestamp: startOfDay.getTime() });
      const todaySummaryArray = processLogsByDay(logsToProcess);

      // Always remove the old entry for today to avoid duplicates
      history = history.filter(day => day.date !== todayDateString);

      // --- CORRECTED LOGIC IS HERE ---
      if (todaySummaryArray.length > 0) {
        // If there were calls today, add the new summary
        history.unshift(todaySummaryArray[0]);
      } else {
        // If NO calls today, add a new zeroed-out entry to maintain history length
        console.log('No calls found for today, adding a zeroed-out record.');
        history.unshift({
            date: todayDateString,
            outgoingCount: 0,
            incomingCount: 0,
            missedCount: 0,
            rejectedCount: 0,
            avgDuration: 0,
            uniqueContacts: 0,
        });
      }
      // --- END OF CORRECTION ---

    // CASE 3: Returning User (missed one or more days)
    } else {
      console.log(`CASE 3: Missed day(s). Fetching logs since last update on ${lastUpdateDateString}.`);
      const startDate = new Date(lastUpdateDateString);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
      const logsToProcess = await CallLog.load(-1, { minTimestamp: startDate.getTime() });
      const newSummaries = processLogsByDay(logsToProcess);

      if (newSummaries.length > 0) {
        const newDates = new Set(newSummaries.map(s => s.date));
        const oldHistoryToKeep = history.filter(day => !newDates.has(day.date));
        history = [...newSummaries, ...oldHistoryToKeep].sort((a, b) => b.date.localeCompare(a.date));
      }
    }

    // --- Finalize and save ---
    if (history.length > HISTORY_LENGTH) {
      history = history.slice(0, HISTORY_LENGTH);
    }
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    await AsyncStorage.setItem(LAST_UPDATE_KEY, todayDateString);
    console.log(`History update complete. Total entries: ${history.length}.`);
    await updateUserBaseline();
  } catch (error) {
    console.error('An error occurred during smart history update:', error);
  }
};

// --- Unchanged updateUserBaseline function ---
const updateUserBaseline = async (): Promise<void> => {
    try {
        const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
        const history: DailySummary[] = historyJson ? JSON.parse(historyJson) : [];
        if (history.length < MINIMUM_DAYS_FOR_BASELINE) {
            console.log(`Not enough data to update baseline. Need ${MINIMUM_DAYS_FOR_BASELINE}, have ${history.length}.`);
            return;
        }
        const totals = history.reduce((acc, day) => {
            acc.outgoing += day.outgoingCount;
            acc.incoming += day.incomingCount;
            acc.missed += day.missedCount;
            acc.rejected += day.rejectedCount;
            acc.duration += day.avgDuration * (day.incomingCount + day.outgoingCount);
            acc.totalCalls += day.incomingCount + day.outgoingCount;
            acc.uniqueContacts += day.uniqueContacts;
            return acc;
        }, { outgoing: 0, incoming: 0, missed: 0, rejected: 0, duration: 0, uniqueContacts: 0, totalCalls: 0 });
        const numDays = history.length;
        const baseline: Baseline = {
            avgOutgoing: totals.outgoing / numDays,
            avgIncoming: totals.incoming / numDays,
            avgMissed: totals.missed / numDays,
            avgRejected: totals.rejected / numDays,
            avgDuration: totals.totalCalls > 0 ? totals.duration / totals.totalCalls : 0,
            avgUniqueContacts: totals.uniqueContacts / numDays,
        };
        await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
        console.log('User baseline has been successfully updated.', baseline);
    } catch (error) {
        console.error('Failed to auto-update user baseline:', error);
    }
};