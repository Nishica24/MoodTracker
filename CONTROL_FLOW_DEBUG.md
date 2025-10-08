# Complete Control Flow: Login to Dashboard & Score Management

## 🔍 **Debugging Added**
I've added comprehensive debugging logs throughout the entire flow. Look for `🔍 DEBUG:` and `❌ DEBUG:` messages in:
- **Backend**: Console logs in Flask server
- **Frontend**: Console logs in React Native (check Metro bundler console)

## 📋 **Complete Control Flow**

### **1. App Startup Flow**
```
app/index.tsx
├── useAuth() hook checks authentication
├── AuthProvider loads stored auth data from AsyncStorage
├── checkAuthStatus() validates token with backend
├── Navigation decision based on auth + onboarding status:
    ├── Not authenticated → /(auth)/login
    ├── Authenticated + onboarding incomplete → /(auth)/onboarding  
    └── Authenticated + onboarding complete → /(tabs) (dashboard)
```

### **2. First-Time User Registration Flow**
```
app/(auth)/registration.tsx
├── User fills form → validateForm()
├── authService.register() → POST /api/register
├── Backend: test_server.py register_user()
    ├── Validates email/password
    ├── Creates user in MongoDB users collection
    ├── Returns: { user: {id, name, email}, token }
├── Frontend saves auth data to AsyncStorage
├── Navigate to /(auth)/onboarding
```

### **3. Onboarding Flow (First Time)**
```
app/(auth)/onboarding.tsx
├── User fills goals/concerns → handleNext()
├── POST /generate-mood-score with user_id
├── Backend: generate_mood_score()
    ├── predict_mood() calculates baseline mood
    ├── Creates/updates score in MongoDB user_scores collection:
        {
          userId: ObjectId,
          date: "2025-01-07",
          overallScore: 7.0,
          breakdown: {
            moodLevel: 7.0,
            socialScore: null,
            workStressScore: null,
            screenTimePenalty: null,
            interactionPenalty: null
          },
          updatedAt: ISODate
        }
    ├── Returns: { mood, mood_level, emoji, user_id }
├── refreshUserProfile() → GET /api/user-profile/{user_id}
├── Backend checks if user has scores → onboarding_complete: true
├── Navigate to /(tabs) with result params
```

### **4. Dashboard Initialization Flow**
```
app/(tabs)/index.tsx (Dashboard)
├── initializeDashboard() runs on mount
├── Check for data from onboarding params
├── If no params (returning user):
    ├── fetchUserScoresFromDB() → GET /api/user-scores/{user_id}
    ├── Backend returns last 7 days of scores
    ├── Use today's score for mood display
├── Request permissions sequentially:
    ├── Call Log Permission → calculateSocialScore()
    ├── Sleep Permission → startAutomaticTracking()
    ├── Screen Time Permission → fetchScreenTimeSummary()
    ├── Microsoft Permission → fetchDashboardScores()
├── Each permission grants access to calculate respective scores
```

### **5. Score Calculation & Storage Flow**
```
Dashboard Permission Flow:
├── Call Log Permission Granted:
    ├── updateDailyHistory() processes call logs
    ├── calculateSocialScore() computes social health
    ├── updateUserScore({ socialScore }) → POST /api/update-user-score
    └── Backend updates breakdown.socialScore in MongoDB

├── Microsoft Permission Granted:
    ├── fetchDashboardScores() → GET /dashboard/scores
    ├── Backend analyzes calendar + emails
    ├── Returns work stress metrics
    ├── updateUserScore({ workStressScore }) → POST /api/update-user-score
    └── Backend updates breakdown.workStressScore in MongoDB

├── Screen Time Permission Granted:
    ├── fetchScreenTimeSummary() gets usage data
    ├── Calculate penalty for > 6 hours usage
    ├── updateUserScore({ screenTimePenalty }) → POST /api/update-user-score
    └── Backend updates breakdown.screenTimePenalty in MongoDB

├── Sleep Permission Granted:
    ├── SleepService tracks sleep automatically
    ├── Calculate sleep quality score
    ├── updateUserScore({ interactionPenalty }) → POST /api/update-user-score
    └── Backend updates breakdown.interactionPenalty in MongoDB
```

### **6. Score Update API Flow**
```
POST /api/update-user-score
├── Backend: update_user_score()
├── Find existing score document for today
├── Update breakdown fields with new values
├── Recalculate overallScore = average of all non-null breakdown values
├── Update MongoDB document
├── Return success response
```

### **7. Refresh Button Flow**
```
Dashboard Refresh Button
├── refreshAllScores() triggered
├── Re-run all permission checks and calculations
├── Update each score type individually
├── Each update calls updateUserScore() → POST /api/update-user-score
├── Backend recalculates and stores updated overallScore
├── UI updates with new values
```

### **8. Returning User Flow (App Restart)**
```
App Restart
├── AuthProvider.checkAuthStatus()
├── Load stored auth data from AsyncStorage
├── Verify token with backend
├── getUserProfile() → GET /api/user-profile/{user_id}
├── Backend checks if user has scores → onboarding_complete: true
├── Navigate directly to dashboard (skip onboarding)
├── Dashboard fetches today's scores from database
├── Display stored mood data + request permissions for live data
```

## 🔧 **Key Backend APIs**

### **Authentication APIs**
- `POST /api/register` - Create new user
- `POST /api/login` - Authenticate user  
- `POST /api/verify-token` - Validate stored token
- `GET /api/user-profile/{user_id}` - Get user info + onboarding status

### **Score Management APIs**
- `POST /generate-mood-score` - Create baseline mood score during onboarding
- `POST /api/update-user-score` - Update daily scores with new metrics
- `GET /api/user-scores/{user_id}` - Get user's score history

### **Live Data APIs**
- `GET /dashboard/scores` - Microsoft work stress analysis
- Various permission-based score calculations

## 🐛 **Debugging the Issues**

### **Issue 1: MongoDB scores showing null**
**Root Cause**: Scores are calculated but not being stored properly
**Debug Steps**:
1. Check backend logs for `🔍 DEBUG: update-user-score called`
2. Verify score data is being sent to API
3. Check MongoDB document updates in logs
4. Verify overallScore recalculation

### **Issue 2: Dashboard shows only mood card on restart**
**Root Cause**: Dashboard relies on onboarding params, not database data
**Fix Applied**: 
1. Added `fetchUserScoresFromDB()` function
2. Dashboard now fetches today's score from database
3. Uses stored mood data when params are not available

### **Issue 3: Android emulator specific issues**
**Potential Causes**:
1. Network connectivity to localhost:5000
2. AsyncStorage persistence on emulator
3. Permission handling differences

**Debug Steps**:
1. Check Metro bundler console for frontend logs
2. Check Flask server console for backend logs
3. Verify API calls are reaching the backend
4. Test with physical device if emulator issues persist

## 📊 **MongoDB Schema**

### **users collection**
```json
{
  "_id": ObjectId,
  "name": "User Name",
  "email": "user@example.com", 
  "password_hash": "hashed_password",
  "created_at": ISODate,
  "updated_at": ISODate,
  "is_active": true,
  "last_login": ISODate
}
```

### **user_scores collection**
```json
{
  "userId": ObjectId("user_id"),
  "date": "2025-01-07",
  "overallScore": 7.4,
  "breakdown": {
    "moodLevel": 8.0,
    "socialScore": 7.5,
    "workStressScore": 3.0,
    "screenTimePenalty": 1.5,
    "interactionPenalty": 0
  },
  "updatedAt": ISODate("2025-01-07T10:30:00Z")
}
```

## 🚀 **Next Steps for Testing**

1. **Test the complete flow**:
   - Register new user → Complete onboarding → Check dashboard
   - Close app → Reopen → Verify dashboard shows data
   - Grant permissions → Check score updates in database

2. **Monitor logs**:
   - Backend: Flask server console
   - Frontend: Metro bundler console
   - Look for `🔍 DEBUG:` messages to trace the flow

3. **Verify database**:
   - Check MongoDB user_scores collection
   - Verify scores are being updated correctly
   - Confirm overallScore calculations

The debugging logs will help you identify exactly where the flow breaks and what data is being passed between components.
