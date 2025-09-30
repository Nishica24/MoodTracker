from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS
import logging
from datetime import datetime, timezone, timedelta, time
from flask_pymongo import PyMongo
from collections import defaultdict
from datetime import timedelta
from typing import Dict
from Services.groqClient import generate_mood_report
import requests
import secrets
from dotenv import load_dotenv
from microsoft_config import get_msal_app, CLIENT_ID, REDIRECT_URI, SCOPES, AUTHORITY

# Load environment variables
load_dotenv()

# ---------------- App Setup ----------------
app = Flask(__name__)
CORS(app)

# Set secret key for sessions
app.secret_key = secrets.token_hex(32)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------- MongoDB Connection ----------------

# Configure MongoDB URI for flask_pymongo
app.config["MONGO_URI"] = "mongodb+srv://nishica22210402:UW1Gy7gzbdwPR0WG@cluster0.0gblwuc.mongodb.net/Mood_Tracker?retryWrites=true&w=majority&appName=Cluster0"
mongo = PyMongo(app)

# Get database
db = mongo.db

# ---------------- In-memory store for Microsoft login state ----------------
ms_tokens: Dict[str, dict] = {}

# ---------------- Feature Space ----------------
goals_list = [
    "Improved mental health",
    "Better sleep",
    "Reduce stress",
    "Track habits",
    "Social Wellness",
    "Work-life balance"
]

concerns_list = [
    "Anxiety",
    "Depression",
    "Sleep issues",
    "Work Stress",
    "Social isolation",
    "Screen addiction"
]

# ---------------- Weights ----------------
goal_weight = 2
concern_weight = -2


# ---------------- Mood Mapping ----------------
def get_mood_from_score(score):
    if score >= 10:
        return "Extreme Happy", 10, "😎"
    elif score >= 8:
        return "Motivated", 9, "🚀"
    elif score >= 6:
        return "Happy", 8, "😃"
    elif score >= 4:
        return "Hopeful", 7, "🙂"
    elif score >= 2:
        return "Determined but Struggling", 5, "😐"
    elif score >= 0:
        return "Stressed", 4, "😟"
    elif score >= -2:
        return "Overwhelmed", 3, "😣"
    else:
        return "Confused", 2, "😕"



# ---------------- Prediction Function ----------------

def predict_mood(goals_selected, concerns_selected):
    # normalize strings to lowercase for robust matching
    goals_norm = [g.lower() for g in goals_list]
    concerns_norm = [c.lower() for c in concerns_list]

    num_goals = len([g for g in goals_selected if g.lower() in goals_norm])
    num_concerns = len([c for c in concerns_selected if c.lower() in concerns_norm])

    score = num_goals * goal_weight + num_concerns * concern_weight
    print(f"DEBUG → goals: {num_goals}, concerns: {num_concerns}, score: {score}")
    mood, level, emoji = get_mood_from_score(score)
    return mood, level, emoji


# ---------------- API Routes ----------------
@app.route("/")
def home():

    logger.info("Backend test complete. It is running successfully")

    logger.info("testing mongoDB connection now : ")

    db.Mood_Score.insert_one({
        "user_id": 12345,
        "mood": "test mood",
        "mood_level": 7,
        "mood_emoji": "🥲",
        "created_at": datetime.now(timezone.utc)
    })

    for mood_doc in db.Mood_Score.find():
        print(mood_doc)


    return jsonify({"message": "Mood Tracker API is running"})
# ---------------- Microsoft OAuth Implementation ----------------

@app.route('/login', methods=['GET'])
def ms_login():
    device_id = request.args.get('device_id', '').strip()
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400
    
    # Store device_id in session for callback
    session['device_id'] = device_id
    
    # Create MSAL app instance
    app_msal = get_msal_app()
    
    # Generate authorization URL
    auth_url = app_msal.get_authorization_request_url(
        SCOPES,
        redirect_uri=REDIRECT_URI,
        state=secrets.token_urlsafe(32)  # CSRF protection
    )
    
    return redirect(auth_url)

@app.route('/auth/callback', methods=['GET'])
def auth_callback():
    """Handle OAuth callback from Microsoft"""
    device_id = session.get('device_id')
    if not device_id:
        return jsonify({"error": "No device_id in session"}), 400
    
    # Get authorization code from callback
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        logger.error(f"OAuth error: {error}")
        return (
            "<html><body><h3>Login failed. Please try again.</h3>"
            "<script>setTimeout(function(){window.close();}, 2000);</script>"
            "</body></html>"
        )
    
    if not code:
        return jsonify({"error": "No authorization code received"}), 400
    
    try:
        # Create MSAL app instance
        app_msal = get_msal_app()
        
        # Exchange authorization code for tokens
        result = app_msal.acquire_token_by_authorization_code(
            code,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        
        if "error" in result:
            logger.error(f"Token acquisition error: {result.get('error_description')}")
            return (
                "<html><body><h3>Token acquisition failed. Please try again.</h3>"
                "<script>setTimeout(function(){window.close();}, 2000);</script>"
                "</body></html>"
            )
        
        # Store tokens for the device
        ms_tokens[device_id] = {
            "access_token": result["access_token"],
            "refresh_token": result.get("refresh_token"),
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=result.get("expires_in", 3600)),
            "scope": result.get("scope", ""),
            "token_type": result.get("token_type", "Bearer")
        }
        
        logger.info(f"Successfully authenticated device: {device_id}")
        
        return (
            "<html><body><h3>Microsoft account connected successfully!</h3>"
            "<p>You can now close this window.</p>"
            "<script>setTimeout(function(){window.close();}, 1500);</script>"
            "</body></html>"
        )
        
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        return (
            "<html><body><h3>Authentication failed. Please try again.</h3>"
            "<script>setTimeout(function(){window.close();}, 2000);</script>"
            "</body></html>"
        )

def refresh_access_token(device_id):
    """Refresh access token using refresh token"""
    token_data = ms_tokens.get(device_id)
    if not token_data or not token_data.get('refresh_token'):
        return False
    
    try:
        app_msal = get_msal_app()
        result = app_msal.acquire_token_by_refresh_token(
            token_data['refresh_token'],
            scopes=SCOPES
        )
        
        if "error" in result:
            logger.error(f"Token refresh error: {result.get('error_description')}")
            return False
        
        # Update stored tokens
        ms_tokens[device_id].update({
            "access_token": result["access_token"],
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=result.get("expires_in", 3600)),
            "scope": result.get("scope", ""),
            "token_type": result.get("token_type", "Bearer")
        })
        
        # Update refresh token if provided
        if result.get("refresh_token"):
            ms_tokens[device_id]["refresh_token"] = result["refresh_token"]
        
        logger.info(f"Successfully refreshed token for device: {device_id}")
        return True
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return False

@app.route('/connection-status', methods=['GET'])
def connection_status():
    device_id = request.args.get('device_id', '').strip()
    if not device_id:
        return jsonify({"connected": False}), 200
    
    token = ms_tokens.get(device_id)
    if not token:
        return jsonify({"connected": False}), 200
    
    # Check if token is expired
    if token.get('expires_at') and token['expires_at'] <= datetime.now(timezone.utc):
        # Try to refresh the token
        if refresh_access_token(device_id):
            return jsonify({"connected": True})
        else:
            # Remove invalid token
            del ms_tokens[device_id]
            return jsonify({"connected": False})
    
    return jsonify({"connected": True})

def get_valid_access_token(device_id):
    """Get a valid access token, refreshing if necessary"""
    token_data = ms_tokens.get(device_id)
    if not token_data:
        return None
    
    # Check if token is expired
    if token_data.get('expires_at') and token_data['expires_at'] <= datetime.now(timezone.utc):
        if not refresh_access_token(device_id):
            return None
        token_data = ms_tokens.get(device_id)
    
    return token_data.get('access_token')

@app.route('/graph/me', methods=['GET'])
def graph_me():
    device_id = request.args.get('device_id', '').strip()
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400
    
    access_token = get_valid_access_token(device_id)
    if not access_token:
        return jsonify({"error": "not connected or token expired"}), 401
    
    try:
        # Call Microsoft Graph API
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            logger.error(f"Graph API error: {response.status_code} - {response.text}")
            return jsonify({"error": "Failed to fetch user profile"}), response.status_code
            
    except Exception as e:
        logger.error(f"Error calling Graph API: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/graph/events', methods=['GET'])
def graph_events():
    device_id = request.args.get('device_id', '').strip()
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400
    
    access_token = get_valid_access_token(device_id)
    if not access_token:
        return jsonify({"error": "not connected or token expired"}), 401
    
    try:
        # Call Microsoft Graph API for calendar events
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        # Get events for today
        today = datetime.now(timezone.utc).strftime('%Y-%m-%dT00:00:00.000Z')
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime('%Y-%m-%dT00:00:00.000Z')
        
        url = f'https://graph.microsoft.com/v1.0/me/events'
        params = {
            'startDateTime': today,
            'endDateTime': tomorrow,
            '$select': 'subject,start,end,location'
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            logger.error(f"Graph API error: {response.status_code} - {response.text}")
            return jsonify({"error": "Failed to fetch events"}), response.status_code
            
    except Exception as e:
        logger.error(f"Error calling Graph API: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500



@app.route("/generate-mood-score", methods=["POST"])
def generate_mood_score():
    try:
        data = request.json
        user_id = data.get('user_id', 0)
        goals = data.get("goals", [])
        concerns = data.get("concerns", [])

        mood, mood_level, mood_emoji = predict_mood(goals, concerns)

        logger.info(f"✅ Mood predicted: {mood} ({mood_level} {mood_emoji})")


# Commenting out the database connection right now for testing purposes. Bring it back when IP is whitelisted on the MongoDB Atlas
        try:
            logger.info('user ID - ', user_id)
            logger.info('time stamp - ', datetime.now(timezone.utc))
            logger.info("Pushing data to database : ")
            db.Mood_Score.insert_one({
                "user_id:": user_id,
                "mood": mood,
                "mood_level": mood_level,
                "mood_emoji": mood_emoji,
                "created_at": datetime.now(timezone.utc)
            })

            logger.info("Data pushed to database successfully")

        except Exception as e:
            logger.error(f"❌ Error pushing data to database: {e}")

        return jsonify({
            "mood": mood,
            "mood_level": mood_level,
            "emoji": mood_emoji,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"❌ Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500



# -----------------  Helper function for calculating the daily averages -------------------

# def calculate_daily_averages(mood_entries):
#     """
#     Aggregates mood entries to get a single average score per day.
#     """
#     daily_scores = defaultdict(lambda: {'total': 0, 'count': 0})
#
#     for entry in mood_entries:
#         # Get the date part of the timestamp
#         day = entry['time_stamp'].strftime('%Y-%m-%d')
#         daily_scores[day]['total'] += entry['mood_level']
#         daily_scores[day]['count'] += 1
#
#     # Calculate the average for each day
#     daily_averages = {
#         day: data['total'] / data['count'] for day, data in daily_scores.items()
#     }
#     return daily_averages


# -------- API route to fetch the database mood scores for the analytics chart ------------

@app.route('/api/mood-analytics/<int:user_id>', methods=['GET'])
def get_mood_analytics(user_id):
    """
    Provides mood analytics data for a specific user.
    Currently supports a 'weekly' period.
    """
    period = request.args.get('period', 'week') # Default to 'weekly'

    if period != 'week':
        return jsonify({"error": "Only 'weekly' period is currently supported"}), 400

    try:
        # 1. Calculate the date range for the last 7 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        print('end_date - ', end_date)
        print('start_date - ', start_date)
        print('user_id - ', user_id)

        # 2. Query MongoDB for mood scores within the date range for the user
#         query = {
#             "userId": user_id,
#             "created_at": {"$gte": start_date, "$lt": end_date}
#         }
        # The 'collection' variable is now managed by Flask-PyMongo
        mood_entries = list(db.Mood_Score.find())
        app.logger.info(f"Found {len(mood_entries)} entries.")

        if not mood_entries:
            return jsonify({"labels": [], "data": [], "average": 0})

        # --- FIX: Use defaultdict for cleaner aggregation ---
        daily_scores = defaultdict(list)
        for entry in mood_entries:
            day_str = entry['created_at'].strftime('%a') # e.g., 'Mon'
            daily_scores[day_str].append(entry['mood_level'])

        labels = []
        data = []
        total_mood_sum = 0
        total_mood_count = 0

        for i in range(7):
            day = start_date + timedelta(days=i)
            day_str = day.strftime('%a')
            labels.append(day_str)

            if day_str in daily_scores:
                day_avg = sum(daily_scores[day_str]) / len(daily_scores[day_str])
                data.append(day_avg)
                total_mood_sum += sum(daily_scores[day_str])
                total_mood_count += len(daily_scores[day_str])
            else:
                data.append(0)

        average = (total_mood_sum / total_mood_count) if total_mood_count > 0 else 0

        return jsonify({
            "labels": labels,
            "data": data,
            "average": round(average, 2)
        })

    except Exception as e:
        app.logger.error(f"An error occurred: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500



@app.route("/test-mood", methods=["GET"])
def test_mood():
    try:
        test_goals = ["Improved mental health", "Better sleep"]
        test_concerns = ["Anxiety"]

        mood, level, emoji = predict_mood(test_goals, test_concerns)

        return jsonify({
            "test_goals": test_goals,
            "test_concerns": test_concerns,
            "predicted_mood": mood,
            "mood_level": level,
            "emoji": emoji
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- Report Generation API ----------------

@app.route('/generate-mood-report', methods=['POST'])
def generate_report():
    print('Received request to generate mood report...')
    mood_data = request.json

    if not mood_data:
        return jsonify({"error": "Request body must contain mood data."}), 400

    try:
        # Run the async function in the event loop
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        report = loop.run_until_complete(generate_mood_report(mood_data))
        loop.close()
        
        return jsonify(report), 200
    except Exception as error:
        print(f"Failed to generate report: {error}")
        return jsonify({"error": "Failed to generate report", "details": str(error)}), 500

@app.route('/generate-screentime-report', methods=['POST'])
def generate_screentime_report():
    print('Received request to generate screen time report...')
    screentime_data = request.json

    if not screentime_data:
        return jsonify({"error": "Request body must contain screen time data."}), 400

    try:
        # Extract screen time data
        daily_screen_time = screentime_data.get('daily_screen_time', [])
        app_usage_breakdown = screentime_data.get('app_usage_breakdown', [])
        
        # Calculate insights
        total_hours = sum(day['total_hours'] for day in daily_screen_time)
        avg_hours = total_hours / len(daily_screen_time) if daily_screen_time else 0
        
        # Generate insights based on screen time data
        insights = []
        if avg_hours < 4:
            insights.append("Great job! Your screen time is well within healthy limits.")
        elif avg_hours < 6:
            insights.append("Your screen time is moderate. Consider taking more breaks to maintain digital wellness.")
        else:
            insights.append("Your screen time is quite high. Try setting daily limits for different apps.")
        
        # Generate trend insights
        if len(daily_screen_time) >= 2:
            recent_avg = sum(day['total_hours'] for day in daily_screen_time[-3:]) / min(3, len(daily_screen_time))
            older_avg = sum(day['total_hours'] for day in daily_screen_time[:-3]) / max(1, len(daily_screen_time) - 3)
            change_percent = ((recent_avg - older_avg) / older_avg) * 100 if older_avg > 0 else 0
            
            if change_percent < -10:
                insights.append(f"Excellent! You've reduced your screen time by {abs(change_percent):.1f}% recently.")
            elif change_percent > 10:
                insights.append(f"Your screen time has increased by {change_percent:.1f}%. Consider setting some boundaries.")
        
        # Generate app usage insights
        if app_usage_breakdown:
            top_app = app_usage_breakdown[0]
            if top_app['usage_hours'] > 2:
                insights.append(f"{top_app['app_name']} is your most used app with {top_app['usage_hours']:.1f} hours today.")
        
        # Generate suggestions
        suggestions = [
            "Set app limits for social media and entertainment apps",
            "Schedule screen-free time each day for reading or exercise",
            "Use grayscale mode to make screens less engaging",
            "Practice mindful usage - ask yourself if an app serves a purpose before opening it",
            "Enable focus mode during work or study hours"
        ]
        
        # Add specific suggestions based on usage patterns
        if avg_hours > 6:
            suggestions.append("Consider a digital detox day once a week")
        if any(app['app_name'].lower().find('social') != -1 for app in app_usage_breakdown[:3]):
            suggestions.append("Limit social media usage to specific times of day")
        
        return jsonify({
            'weekly_insights': insights,
            'improvement_suggestions': suggestions
        }), 200
        
    except Exception as error:
        print(f"Failed to generate screen time report: {error}")
        return jsonify({"error": "Failed to generate screen time report", "details": str(error)}), 500


# ---------------- Run ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

# -------------------------------------------------------------------------------

