/**
 * Utility functions for handling timezone conversions and formatting
 */

/**
 * Get user's current timezone
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Format a timestamp string to local time
 * @param timestamp - ISO timestamp string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatTimestamp = (
  timestamp: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }
): string => {
  if (!timestamp) {
    return 'Never';
  }

  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
};

/**
 * Format a timestamp to show relative time (e.g., "2 hours ago")
 * @param timestamp - ISO timestamp string
 * @returns Relative time string
 */
export const formatRelativeTime = (timestamp: string | null | undefined): string => {
  if (!timestamp) {
    return 'Never';
  }

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
};

/**
 * Get timezone offset string (e.g., "UTC+5:30", "UTC-8:00")
 * @param timezone - Timezone string (optional, defaults to user's timezone)
 * @returns Timezone offset string
 */
export const getTimezoneOffset = (timezone?: string): string => {
  const tz = timezone || getUserTimezone();
  const now = new Date();
  const offset = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    timeZoneName: 'longOffset'
  }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';

  return offset || `UTC${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset() / 60).toString().padStart(2, '0')}:00`;
};
