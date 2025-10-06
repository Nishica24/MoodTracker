/**
 * User Profile System
 * Manages user profile data for contextual scoring
 */

export interface UserProfile {
  name: string;
  age: number;
  role: 'student' | 'working_adult' | 'professional';
  jobTitle?: string;
  workHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  timezone: string;
  preferences: {
    studyHours?: string[];
    workDays?: string[];
    focusMode?: boolean;
  };
}

/**
 * Default user profile
 */
export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'User',
  age: 25,
  role: 'working_adult',
  workHours: {
    start: '09:00',
    end: '17:00'
  },
  timezone: 'UTC',
  preferences: {
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  }
};

/**
 * Gets user-specific weights based on age and role
 * @param age - User's age
 * @param role - User's role
 * @returns Weight configuration for scoring
 */
export const getUserSpecificWeights = (age: number, role: UserProfile['role']) => {
  // Age-Based Weights as specified:
  // Students: Mood(40%) + Social(25%) + WorkStress(15%) + ScreenTime(20%)
  // Working Adults: Mood(35%) + Social(20%) + WorkStress(30%) + ScreenTime(15%)
  // Professionals: Mood(30%) + Social(25%) + WorkStress(25%) + ScreenTime(20%)

  if (role === 'student') {
    return {
      mood: 0.40,
      social: 0.25,
      workStress: 0.15,
      screenTime: 0.20
    };
  } else if (role === 'working_adult') {
    return {
      mood: 0.35,
      social: 0.20,
      workStress: 0.30,
      screenTime: 0.15
    };
  } else if (role === 'professional') {
    return {
      mood: 0.30,
      social: 0.25,
      workStress: 0.25,
      screenTime: 0.20
    };
  }

  // Default fallback
  return {
    mood: 0.40,
    social: 0.25,
    workStress: 0.20,
    screenTime: 0.15
  };
};

/**
 * Determines if current time is within work hours
 * @param userProfile - User profile data
 * @returns True if current time is within work hours
 */
export const isWorkHours = (userProfile: UserProfile): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = userProfile.workHours.start.split(':').map(Number);
  const [endHour, endMinute] = userProfile.workHours.end.split(':').map(Number);
  
  const workStart = startHour * 60 + startMinute;
  const workEnd = endHour * 60 + endMinute;

  return currentTime >= workStart && currentTime <= workEnd;
};

/**
 * Determines if current day is a work day
 * @param userProfile - User profile data
 * @returns True if current day is a work day
 */
export const isWorkDay = (userProfile: UserProfile): boolean => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  return userProfile.preferences.workDays?.includes(today) ?? true;
};

/**
 * Gets contextual time period for scoring
 * @param userProfile - User profile data
 * @returns Time period context
 */
export const getTimeContext = (userProfile: UserProfile): 'work' | 'leisure' | 'study' => {
  const isWork = isWorkHours(userProfile) && isWorkDay(userProfile);
  
  if (isWork) {
    return 'work';
  } else if (userProfile.role === 'student' && userProfile.preferences.studyHours) {
    const now = new Date();
    const currentHour = now.getHours();
    const [studyStart, studyEnd] = userProfile.preferences.studyHours.map(h => parseInt(h.split(':')[0]));
    
    if (currentHour >= studyStart && currentHour <= studyEnd) {
      return 'study';
    }
  }
  
  return 'leisure';
};
