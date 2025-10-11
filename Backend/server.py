from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS
import logging
from datetime import datetime, timezone, timedelta, time
import pytz
from flask_pymongo import PyMongo
from collections import defaultdict
from datetime import timedelta
from typing import Dict
from Services.groqClient import generate_mood_report
from Services.auth_service import AuthService
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

# ---------------- Authentication Service ----------------
auth_service = AuthService()

# ---------------- Timezone Configuration ----------------
def get_user_timezone(user_timezone=None):
    """Get user's timezone or fallback to UTC"""
    if user_timezone and user_timezone in pytz.all_timezones:
        try:
            return pytz.timezone(user_timezone)
        except:
            pass
    # Fallback to UTC if no valid timezone provided
    return pytz.timezone('UTC')

def get_user_date(user_timezone=None):
    """Get current date in user's timezone"""
    tz = get_user_timezone(user_timezone)
    local_time = datetime.now(tz)
    return local_time.date().isoformat()

def get_user_datetime(user_timezone=None):
    """Get current datetime in user's timezone"""
    tz = get_user_timezone(user_timezone)
    return datetime.now(tz)

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

#         print("Ms token acquired: ", ms_tokens[device_id])
        
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
    logger.info(f"🔍 DEBUG: Connection status check for device_id={device_id}")
    
    if not device_id:
        logger.warning("⚠️ DEBUG: No device_id provided")
        return jsonify({"connected": False, "reason": "no_device_id"}), 200
    
    token = ms_tokens.get(device_id)
    logger.info(f"🔍 DEBUG: Token exists for device_id: {token is not None}")
    
    if not token:
        logger.warning(f"⚠️ DEBUG: No token found for device_id={device_id}")
        return jsonify({"connected": False, "reason": "no_token"}), 200
    
    # Check if token is expired
    if token.get('expires_at'):
        expires_at = token['expires_at']
        now = datetime.now(timezone.utc)
        logger.info(f"🔍 DEBUG: Token expires at: {expires_at}, Current time: {now}")
        
        if expires_at <= now:
            logger.info(f"🔄 DEBUG: Token expired, attempting refresh for device_id={device_id}")
            # Try to refresh the token
            if refresh_access_token(device_id):
                logger.info(f"✅ DEBUG: Token refreshed successfully for device_id={device_id}")
                return jsonify({"connected": True, "reason": "refreshed"})
            else:
                logger.error(f"❌ DEBUG: Token refresh failed for device_id={device_id}")
                # Remove invalid token
                if device_id in ms_tokens:
                    del ms_tokens[device_id]
                return jsonify({"connected": False, "reason": "refresh_failed"})
        else:
            logger.info(f"✅ DEBUG: Token is still valid for device_id={device_id}")
            return jsonify({"connected": True, "reason": "valid_token"})
    else:
        logger.warning(f"⚠️ DEBUG: No expiration time found for device_id={device_id}")
        return jsonify({"connected": True, "reason": "no_expiration"})

# ---------------- User Authentication Endpoints ----------------

@app.route('/api/register', methods=['POST'])
def register_user():
    """Register a new user with email and password"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirmPassword', '')
        
        # Validate required fields
        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400
        
        # Validate email format
        if not auth_service.validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        
        # Validate password strength
        password_validation = auth_service.validate_password(password)
        if not password_validation['is_valid']:
            return jsonify({
                "error": "Password does not meet requirements",
                "details": password_validation['errors']
            }), 400
        
        # Check if passwords match
        if password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400
        
        # Check if user already exists
        existing_user = db.users.find_one({"email": email.lower()})
        if existing_user:
            return jsonify({"error": "User with this email already exists"}), 409
        
        # Create user data
        user_data = auth_service.create_user_data(name, email, password)
        
        # Insert user into database
        result = db.users.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        # Generate JWT token
        token = auth_service.generate_token(user_id, email)
        
        logger.info(f"User registered successfully: {email}")
        
        return jsonify({
            "message": "User registered successfully",
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            },
            "token": token
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    """Login user with email and password"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # Validate required fields
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Validate email format
        if not auth_service.validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        
        # Find user in database
        user = db.users.find_one({"email": email.lower()})
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Verify password
        if not auth_service.verify_password(password, user['password_hash']):
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Check if user is active
        if not user.get('is_active', True):
            return jsonify({"error": "Account is deactivated"}), 401
        
        # Update last login
        db.users.update_one(
            {"_id": user['_id']},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        # Generate JWT token
        user_id = str(user['_id'])
        token = auth_service.generate_token(user_id, email)
        
        logger.info(f"User logged in successfully: {email}")
        
        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user_id,
                "name": user['name'],
                "email": user['email']
            },
            "token": token
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token and return user info"""
    try:
        data = request.json
        if not data or 'token' not in data:
            return jsonify({"error": "Token is required"}), 400
        
        token = data['token']
        payload = auth_service.verify_token(token)
        
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Get user from database
        user = db.users.find_one({"_id": payload['user_id']})
        if not user or not user.get('is_active', True):
            return jsonify({"error": "User not found or inactive"}), 401
        
        return jsonify({
            "valid": True,
            "user": {
                "id": str(user['_id']),
                "name": user['name'],
                "email": user['email']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/debug-devices', methods=['GET'])
def debug_devices():
    """Debug endpoint to see connected device IDs"""
    connected_devices = []
    for device_id, token_data in ms_tokens.items():
        is_expired = token_data.get('expires_at') and token_data['expires_at'] <= datetime.now(timezone.utc)
        connected_devices.append({
            "device_id": device_id,
            "expires_at": token_data.get('expires_at').isoformat() if token_data.get('expires_at') else None,
            "is_expired": is_expired,
            "has_refresh_token": bool(token_data.get('refresh_token'))
        })
    
    return jsonify({
        "total_devices": len(ms_tokens),
        "devices": connected_devices
    })


def get_valid_access_token(device_id):
    """Get a valid access token, refreshing if necessary"""
    logger.info(f"🔍 DEBUG: Getting valid access token for device_id={device_id}")
    
    token_data = ms_tokens.get(device_id)
    logger.info(f"🔍 DEBUG: Token data exists: {token_data is not None}")
    
    if not token_data:
        logger.warning(f"⚠️ DEBUG: No token data found for device_id={device_id}")
        return None
    
    # Check if token is expired
    if token_data.get('expires_at'):
        expires_at = token_data['expires_at']
        now = datetime.now(timezone.utc)
        logger.info(f"🔍 DEBUG: Token expires at: {expires_at}, Current time: {now}")
        
        if expires_at <= now:
            logger.info(f"🔄 DEBUG: Token expired, attempting refresh for device_id={device_id}")
            if not refresh_access_token(device_id):
                logger.error(f"❌ DEBUG: Token refresh failed for device_id={device_id}")
                # Remove invalid token from storage
                if device_id in ms_tokens:
                    del ms_tokens[device_id]
                return None
            token_data = ms_tokens.get(device_id)
            logger.info(f"✅ DEBUG: Token refreshed successfully for device_id={device_id}")
        else:
            logger.info(f"✅ DEBUG: Token is still valid for device_id={device_id}")
    else:
        logger.warning(f"⚠️ DEBUG: No expiration time found for device_id={device_id}")
    
    access_token = token_data.get('access_token')
    logger.info(f"🔍 DEBUG: Returning access token: {access_token is not None}")
    return access_token

@app.route('/graph/work-stress', methods=['GET'])
def graph_work_stress():

    print("Inside graph work stress")

    device_id = request.args.get('device_id', '').strip()
    period = request.args.get('period', 'week')
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400

    access_token = get_valid_access_token(device_id)
    if not access_token:
        return jsonify({"error": "not connected or token expired"}), 401

    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        # Determine date range (default: last 7 days)
        end_dt = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=0)
        start_dt = end_dt - timedelta(days=6)

        # Fetch calendar events using calendarView for accurate windowing
        cal_url = 'https://graph.microsoft.com/v1.0/me/calendarView'
        cal_params = {
            'startDateTime': start_dt.isoformat(),
            'endDateTime': end_dt.isoformat(),
            '$select': 'subject,start,end,location,organizer',
            '$top': '1000',
        }
        cal_resp = requests.get(cal_url, headers=headers, params=cal_params)
        if cal_resp.status_code != 200:
            logger.error(f"Graph calendarView error: {cal_resp.status_code} - {cal_resp.text}")
            return jsonify({"error": "Failed to fetch calendar events"}), cal_resp.status_code
        cal_data = cal_resp.json().get('value', [])

        print("Logging the calendar data fetched: ", cal_data)

        # Fetch recent emails (last 7 days, top N)
        mail_url = 'https://graph.microsoft.com/v1.0/me/messages'
        
        # For email filter, use start of day to include all emails from that day
        email_start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        print(f"Email filter start → {email_start_dt.isoformat()}")
        
        # Try without filter first to see if we can get any emails at all
        mail_params_simple = {
            '$select': 'subject,receivedDateTime',
            '$orderby': 'receivedDateTime desc',
            '$top': '50'
        }
        print(f"GET {mail_url} params={mail_params_simple} (simple query)")
        mail_resp_simple = requests.get(mail_url, headers=headers, params=mail_params_simple)
        print(f"Simple messages status={mail_resp_simple.status_code}")
        if mail_resp_simple.status_code != 200:
            logger.error(f"Graph messages error (simple): {mail_resp_simple.status_code} - {mail_resp_simple.text}")
            print(f"Simple messages error body: {mail_resp_simple.text}")
            mail_data = []
        else:
            mail_data_simple = mail_resp_simple.json().get('value', [])
            print(f"Simple query fetched: {len(mail_data_simple)} emails")
            if mail_data_simple:
                print(f"Sample email from simple query: {mail_data_simple[0]}")
                # Filter manually for last 7 days
                mail_data = []
                for email in mail_data_simple:
                    try:
                        received_dt = datetime.fromisoformat(email['receivedDateTime'].replace('Z', '+00:00'))
                        if received_dt >= email_start_dt:
                            mail_data.append(email)
                    except Exception as ex:
                        print(f"Error parsing email date: {ex}")
                print(f"After manual filtering: {len(mail_data)} emails in date range")
            else:
                mail_data = []
                print("No emails found in simple query")
        
        # Also try the original filtered query for comparison
        mail_params = {
            '$select': 'subject,receivedDateTime',
            '$orderby': 'receivedDateTime desc',
            '$top': '200',
            '$filter': f"receivedDateTime ge {email_start_dt.isoformat()}"
        }
        print(f"GET {mail_url} params={mail_params} (filtered query)")
        mail_resp = requests.get(mail_url, headers=headers, params=mail_params)
        print(f"Filtered messages status={mail_resp.status_code}")
        if mail_resp.status_code != 200:
            logger.error(f"Graph messages error (filtered): {mail_resp.status_code} - {mail_resp.text}")
            print(f"Filtered messages error body: {mail_resp.text}")
        else:
            mail_data_filtered = mail_resp.json().get('value', [])
            print(f"Filtered query fetched: {len(mail_data_filtered)} emails")
            if mail_data_filtered:
                print(f"Sample email from filtered query: {mail_data_filtered[0]}")
                # Use filtered data if it worked
                mail_data = mail_data_filtered

        # Build per-day aggregates
        day_keys = []
        day_start = start_dt
        for i in range(7):
            key = (day_start + timedelta(days=i)).date().isoformat()
            day_keys.append(key)

        events_by_day = {k: [] for k in day_keys}
        emails_by_day = {k: [] for k in day_keys}

        def clamp(v, lo, hi):
            return max(lo, min(hi, v))

        # Bucket events by day; count durations and overlaps
        for ev in cal_data:
            try:
                s = ev.get('start', {}).get('dateTime')
                e = ev.get('end', {}).get('dateTime')
                if not s or not e:
                    continue
                sd = datetime.fromisoformat(s.replace('Z', '+00:00'))
                ed = datetime.fromisoformat(e.replace('Z', '+00:00'))
                day_key = sd.date().isoformat()
                if day_key in events_by_day:
                    events_by_day[day_key].append((sd, ed, ev))
            except Exception:
                continue

        # Bucket emails by day
        for m in mail_data:
            try:
                r = m.get('receivedDateTime')
                if not r:
                    continue
                rd = datetime.fromisoformat(r.replace('Z', '+00:00'))
                day_key = rd.date().isoformat()
                if day_key in emails_by_day:
                    emails_by_day[day_key].append(m)
            except Exception:
                continue

        # Heuristic scoring per day (1-10)
        labels = []
        data = []
        for i, day_key in enumerate(day_keys):
            day_dt = start_dt.date() + timedelta(days=i)
            labels.append(day_dt.strftime('%a'))

            day_events = sorted(events_by_day.get(day_key, []), key=lambda x: x[0])
            day_emails = emails_by_day.get(day_key, [])

            # Metrics
            total_meeting_hours = 0.0
            back_to_back_count = 0
            after_hours_emails = 0
            early_morning_meetings = 0

            last_end = None
            for sd, ed, _ in day_events:
                dur = (ed - sd).total_seconds() / 3600.0
                total_meeting_hours += max(0.0, dur)
                if last_end is not None and (sd - last_end).total_seconds() <= 15 * 60:
                    back_to_back_count += 1
                last_end = ed
                # Early meetings before 9am local
                if sd.time() < time(9, 0):
                    early_morning_meetings += 1

            for m in day_emails:
                try:
                    rd = datetime.fromisoformat(m['receivedDateTime'].replace('Z', '+00:00'))
                    if rd.time() < time(7, 0) or rd.time() > time(19, 0):
                        after_hours_emails += 1
                except Exception:
                    continue

            # Convert metrics to stress score components
            score = 0.0
            # Meeting load: map 0-6h → 0-5 points
            score += clamp(total_meeting_hours / 6.0 * 5.0, 0.0, 5.0)
            # Back-to-back: each contributes up to 2 points capped at 2
            score += clamp(back_to_back_count * 0.5, 0.0, 2.0)
            # After-hours emails: up to 2 points
            score += clamp(after_hours_emails * 0.3, 0.0, 2.0)
            # Early meetings: up to 1 point
            score += clamp(early_morning_meetings * 0.3, 0.0, 1.0)

            # Normalize to 1-10 scale and clamp
            score = clamp(score * (10.0 / 10.0), 1.0, 10.0)
            data.append(round(score, 1))

        avg = round(sum(data) / len(data), 1) if data else 0

        return jsonify({
            'labels': labels,
            'data': data,
            'average': avg,
            'period': period,
        })

    except Exception as e:
        logger.error(f"Error computing work stress: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/graph/test-mail', methods=['GET'])
def graph_test_mail():
    """Test endpoint to debug mail access"""
    device_id = request.args.get('device_id', '').strip()
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400
    
    access_token = get_valid_access_token(device_id)
    if not access_token:
        return jsonify({"error": "not connected or token expired"}), 401
    
    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        # Test 1: Get user info
        print("Testing user info...")
        user_resp = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
        print(f"User info status: {user_resp.status_code}")
        if user_resp.status_code == 200:
            user_data = user_resp.json()
            print(f"User: {user_data.get('displayName', 'Unknown')} ({user_data.get('mail', 'No email')})")
        
        # Test 2: Get mail folders
        print("Testing mail folders...")
        folders_resp = requests.get('https://graph.microsoft.com/v1.0/me/mailFolders', headers=headers)
        print(f"Mail folders status: {folders_resp.status_code}")
        if folders_resp.status_code == 200:
            folders_data = folders_resp.json().get('value', [])
            print(f"Found {len(folders_data)} mail folders")
            for folder in folders_data[:3]:  # Show first 3 folders
                print(f"  - {folder.get('displayName', 'Unknown')} ({folder.get('totalItemCount', 0)} items)")
        
        # Test 3: Get recent messages (no filter)
        print("Testing recent messages...")
        messages_resp = requests.get('https://graph.microsoft.com/v1.0/me/messages?$top=10&$select=subject,receivedDateTime', headers=headers)
        print(f"Recent messages status: {messages_resp.status_code}")
        if messages_resp.status_code == 200:
            messages_data = messages_resp.json().get('value', [])
            print(f"Found {len(messages_data)} recent messages")
            for msg in messages_data[:3]:  # Show first 3 messages
                print(f"  - {msg.get('subject', 'No subject')} ({msg.get('receivedDateTime', 'No date')})")
        else:
            print(f"Messages error: {messages_resp.text}")
        
        return jsonify({
            "user_status": user_resp.status_code,
            "folders_status": folders_resp.status_code,
            "messages_status": messages_resp.status_code,
            "user_data": user_data if user_resp.status_code == 200 else None,
            "folders_count": len(folders_data) if folders_resp.status_code == 200 else 0,
            "messages_count": len(messages_data) if messages_resp.status_code == 200 else 0
        })
        
    except Exception as e:
        logger.error(f"Error in test-mail: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

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
    """Generate baseline mood score during onboarding and store in database"""
    try:
        data = request.json
        user_id = data.get('user_id', '')
        goals = data.get("goals", [])
        concerns = data.get("concerns", [])

        logger.info(f"🔍 DEBUG: generate-mood-score called with user_id={user_id}")
        logger.info(f"🔍 DEBUG: goals={goals}, concerns={concerns}")

        if not user_id:
            logger.error("❌ DEBUG: No user_id provided")
            return jsonify({"error": "User ID is required"}), 400

        mood, mood_level, mood_emoji = predict_mood(goals, concerns)

        logger.info(f"✅ Mood predicted: {mood} ({mood_level} {mood_emoji})")

        # Store baseline mood score in new format
        try:
            from bson import ObjectId
            today = get_local_date()  # Use local timezone
            
            logger.info(f"🔍 DEBUG: Storing score for user_id={user_id}, date={today}")
            
            # Check if score already exists for today
            existing_score = db.user_scores.find_one({
                "userId": ObjectId(user_id),
                "date": today
            })
            
            logger.info(f"🔍 DEBUG: Existing score found: {existing_score is not None}")
            
            if existing_score:
                logger.info(f"🔍 DEBUG: Updating existing score: {existing_score}")
                # Update existing score with baseline mood data
                update_result = db.user_scores.update_one(
                    {"userId": ObjectId(user_id), "date": today},
                    {
                        "$set": {
                            "breakdown.moodLevel": float(mood_level),
                            "updatedAt": datetime.now(timezone.utc)
                        }
                    }
                )
                logger.info(f"🔍 DEBUG: Update result: {update_result.modified_count} documents modified")
            else:
                logger.info("🔍 DEBUG: Creating new score document")
                # Create new score document with baseline mood
                score_doc = {
                    "userId": ObjectId(user_id),
                    "date": today,
                    "overallScore": float(mood_level),  # Start with mood level as baseline
                    "breakdown": {
                        "moodLevel": float(mood_level),
                        "socialScore": None,  # Will be updated when permissions granted
                        "workStressScore": None,
                        "screenTimePenalty": None,
                        "interactionPenalty": None
                    },
                    "updatedAt": datetime.now(timezone.utc)
                }
                logger.info(f"🔍 DEBUG: Score document to insert: {score_doc}")
                insert_result = db.user_scores.insert_one(score_doc)
                logger.info(f"🔍 DEBUG: Insert result: {insert_result.inserted_id}")

        except Exception as e:
            logger.error(f"❌ Error storing score in database: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")

        logger.info(f"🔍 DEBUG: Returning response with user_id={user_id}")
        return jsonify({
            "mood": mood,
            "mood_level": mood_level,
            "emoji": mood_emoji,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"❌ Error during prediction: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
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

@app.route('/generate-workstress-report', methods=['POST'])
def generate_workstress_report():
    print('Received request to generate work stress report...')
    workstress_data = request.json

    if not workstress_data:
        return jsonify({"error": "Request body must contain work stress data."}), 400

    try:
        # Extract work stress data
        daily_stress_scores = workstress_data.get('daily_stress_scores', [])
        average_stress_score = workstress_data.get('average_stress_score', 0)
        stress_trend = workstress_data.get('stress_trend', 'stable')
        high_stress_days = workstress_data.get('high_stress_days', 0)
        low_stress_days = workstress_data.get('low_stress_days', 0)
        
        # Generate insights based on work stress data
        insights = []
        
        # Average stress level insights
        if average_stress_score < 4:
            insights.append("Excellent! Your work stress levels are very manageable.")
        elif average_stress_score < 6:
            insights.append("Your work stress is moderate. You're handling work pressure well.")
        elif average_stress_score < 8:
            insights.append("Your work stress is elevated. Consider implementing stress management techniques.")
        else:
            insights.append("Your work stress levels are quite high. It's important to prioritize your mental health.")
        
        # Trend insights
        if stress_trend == 'increasing':
            insights.append("Your stress levels have been rising recently. This is a good time to implement stress reduction strategies.")
        elif stress_trend == 'decreasing':
            insights.append("Great news! Your stress levels have been decreasing, showing effective stress management.")
        else:
            insights.append("Your stress levels have remained relatively stable, which indicates consistent work-life balance.")
        
        # High/low stress day insights
        total_days = len(daily_stress_scores)
        if total_days > 0:
            high_stress_percentage = (high_stress_days / total_days) * 100
            low_stress_percentage = (low_stress_days / total_days) * 100
            
            if high_stress_percentage > 50:
                insights.append(f"You had {high_stress_days} high-stress days ({high_stress_percentage:.0f}% of the period). Consider identifying stress triggers.")
            elif low_stress_percentage > 50:
                insights.append(f"Excellent! You had {low_stress_days} low-stress days ({low_stress_percentage:.0f}% of the period). Keep up the great work!")
        
        # Generate suggestions based on stress patterns
        suggestions = [
            "Take regular breaks every 2 hours to prevent stress buildup",
            "Practice deep breathing exercises during high-stress moments",
            "Set clear boundaries between work and personal time",
            "Prioritize tasks and focus on one thing at a time",
            "Communicate with your manager about workload if it's consistently overwhelming"
        ]
        
        # Add specific suggestions based on stress levels
        if average_stress_score > 7:
            suggestions.extend([
                "Consider talking to HR or a mental health professional about workplace stress",
                "Implement a daily stress journal to identify patterns and triggers",
                "Try meditation or mindfulness apps for 10-15 minutes daily"
            ])
        elif average_stress_score < 4:
            suggestions.extend([
                "Maintain your current healthy work habits",
                "Consider mentoring colleagues who might be struggling with stress",
                "Use your low stress levels to focus on professional development"
            ])
        
        # Add trend-specific suggestions
        if stress_trend == 'increasing':
            suggestions.extend([
                "Schedule a meeting with your manager to discuss workload distribution",
                "Consider delegating some tasks if possible",
                "Implement a 'no work after 6 PM' rule to create boundaries"
            ])
        elif stress_trend == 'decreasing':
            suggestions.append("Continue the strategies that have been helping reduce your stress levels")
        
        return jsonify({
            'weekly_insights': insights,
            'improvement_suggestions': suggestions
        }), 200
        
    except Exception as error:
        print(f"Failed to generate work stress report: {error}")
        return jsonify({"error": "Failed to generate work stress report", "details": str(error)}), 500

        # ---------------- Dashboard Work Stress Scores ---------------- 

@app.route('/api/update-user-score', methods=['POST'])
def update_user_score():
    """Update user's daily score with all available metrics"""
    try:
        data = request.json
        user_id = data.get('user_id', '')
        user_timezone = data.get('timezone', None)  # Get user's timezone
        
        logger.info(f"🔍 DEBUG: update-user-score called with user_id={user_id}")
        logger.info(f"🔍 DEBUG: User timezone: {user_timezone}")
        logger.info(f"🔍 DEBUG: Score data received: {data}")
        
        if not user_id:
            logger.error("❌ DEBUG: No user_id provided")
            return jsonify({"error": "User ID is required"}), 400
        
        from bson import ObjectId
        today = get_user_date(user_timezone)  # Use user's timezone
        
        logger.info(f"🔍 DEBUG: Looking for score on date={today}")
        logger.info(f"🔍 DEBUG: Current user time: {get_user_datetime(user_timezone).isoformat()}")
        
        # Get current score document
        existing_score = db.user_scores.find_one({
            "userId": ObjectId(user_id),
            "date": today
        })
        
        logger.info(f"🔍 DEBUG: Existing score found: {existing_score}")
        
        if not existing_score:
            logger.info("🔍 DEBUG: No score found for today, looking for most recent score")
            # Find the most recent score from previous days
            most_recent_score = db.user_scores.find_one(
                {"userId": ObjectId(user_id)},
                sort=[("date", -1)]  # Sort by date descending to get most recent
            )
            
            if most_recent_score:
                logger.info(f"🔍 DEBUG: Found most recent score from {most_recent_score['date']}")
                # Create a new score for today based on the most recent score
                baseline_score = {
                    "userId": ObjectId(user_id),
                    "date": today,
                    "overallScore": most_recent_score.get("overallScore", 5.0),
                    "breakdown": most_recent_score.get("breakdown", {
                        "moodLevel": 5.0,
                        "socialScore": None,
                        "workStressScore": None,
                        "screenTimePenalty": None,
                        "interactionPenalty": None
                    }).copy(),  # Copy the breakdown from most recent score
                    "updatedAt": get_user_datetime(user_timezone)
                }
                logger.info(f"🔍 DEBUG: Creating score for today based on most recent: {baseline_score}")
            else:
                logger.info("🔍 DEBUG: No previous scores found, creating default baseline")
                # If no previous scores exist, create a default baseline
                baseline_score = {
                    "userId": ObjectId(user_id),
                    "date": today,
                    "overallScore": 5.0,  # Default neutral score
                    "breakdown": {
                        "moodLevel": 5.0,  # Default neutral mood
                        "socialScore": None,
                        "workStressScore": None,
                        "screenTimePenalty": None,
                        "interactionPenalty": None
                    },
                    "updatedAt": get_user_datetime(user_timezone)
                }
                logger.info(f"🔍 DEBUG: Creating default baseline score: {baseline_score}")
            
            insert_result = db.user_scores.insert_one(baseline_score)
            logger.info(f"🔍 DEBUG: Score created with ID: {insert_result.inserted_id}")
            existing_score = baseline_score
        
        # Update with provided metrics
        update_data = {"updatedAt": get_user_datetime(user_timezone)}
        
        if 'socialScore' in data:
            update_data["breakdown.socialScore"] = float(data['socialScore'])
            logger.info(f"🔍 DEBUG: Adding socialScore={data['socialScore']}")
        if 'workStressScore' in data:
            update_data["breakdown.workStressScore"] = float(data['workStressScore'])
            logger.info(f"🔍 DEBUG: Adding workStressScore={data['workStressScore']}")
        if 'screenTimePenalty' in data:
            update_data["breakdown.screenTimePenalty"] = float(data['screenTimePenalty'])
            logger.info(f"🔍 DEBUG: Adding screenTimePenalty={data['screenTimePenalty']}")
        if 'interactionPenalty' in data:
            update_data["breakdown.interactionPenalty"] = float(data['interactionPenalty'])
            logger.info(f"🔍 DEBUG: Adding interactionPenalty={data['interactionPenalty']}")
        
        logger.info(f"🔍 DEBUG: Update data: {update_data}")
        
        # Calculate new overall score
        breakdown = existing_score.get('breakdown', {})
        logger.info(f"🔍 DEBUG: Current breakdown: {breakdown}")
        
        scores = []
        for key, value in breakdown.items():
            if value is not None and isinstance(value, (int, float)):
                scores.append(value)
        
        logger.info(f"🔍 DEBUG: Valid scores for calculation: {scores}")
        
        if scores:
            new_overall = sum(scores) / len(scores)
            update_data["overallScore"] = round(new_overall, 1)
            logger.info(f"🔍 DEBUG: Calculated new overall score: {new_overall}")
        
        # Update the document
        update_result = db.user_scores.update_one(
            {"userId": ObjectId(user_id), "date": today},
            {"$set": update_data}
        )
        
        logger.info(f"🔍 DEBUG: Update result: {update_result.modified_count} documents modified")
        
        # Verify the update
        updated_score = db.user_scores.find_one({
            "userId": ObjectId(user_id),
            "date": today
        })
        logger.info(f"🔍 DEBUG: Updated score after operation: {updated_score}")
        
        logger.info(f"✅ Updated score for user {user_id} on {today}")
        
        return jsonify({
            "message": "Score updated successfully",
            "overallScore": update_data.get("overallScore"),
            "date": today
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error updating user score: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/user-scores/<user_id>', methods=['GET'])
def get_user_scores(user_id):
    """Get user's score history"""
    try:
        from bson import ObjectId
        
        # Get last 7 days of scores
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=6)
        
        scores = list(db.user_scores.find({
            "userId": ObjectId(user_id),
            "date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }).sort("date", -1))

        # Convert ObjectId fields to strings for JSON serialization
        serializable_scores = []
        for score in scores:
            serializable_score = {
                "_id": str(score["_id"]),
                "userId": str(score["userId"]),
                "date": score["date"],
                "overallScore": score.get("overallScore"),
                "breakdown": score.get("breakdown", {}),
                "updatedAt": score.get("updatedAt").isoformat() if score.get("updatedAt") else None
            }
            serializable_scores.append(serializable_score)

        data = jsonify({
            "scores": serializable_scores,
            "period": "week"
        }), 200

        print("User score data: ", data)

        return data
        
    except Exception as e:
        logger.error(f"Error fetching user scores: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/user-profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """Get user profile and check if onboarding is complete"""
    try:
        from bson import ObjectId
        
        logger.info(f"🔍 DEBUG: get_user_profile called with user_id={user_id}")
        
        # Get user from database
        user = db.users.find_one({"_id": ObjectId(user_id)})
        logger.info(f"🔍 DEBUG: User found: {user is not None}")
        
        if not user:
            logger.error("❌ DEBUG: User not found in database")
            return jsonify({"error": "User not found"}), 404
        
        # Check if user has any scores (indicates onboarding completion)
        has_scores = db.user_scores.find_one({"userId": ObjectId(user_id)})
        logger.info(f"🔍 DEBUG: User has scores: {has_scores is not None}")
        
        if has_scores:
            logger.info(f"🔍 DEBUG: Sample score document: {has_scores}")
        
        response_data = {
            "user": {
                "id": str(user['_id']),
                "name": user['name'],
                "email": user['email']
            },
            "onboarding_complete": has_scores is not None,
            "has_scores": has_scores is not None
        }
        
        logger.info(f"🔍 DEBUG: Returning profile data: {response_data}")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"❌ Error fetching user profile: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/dashboard/scores', methods=['GET'])
def get_dashboard_scores():
    """Get comprehensive dashboard scores including work stress, email activity, and calendar insights"""
    device_id = request.args.get('device_id', '').strip()
    if not device_id:
        return jsonify({"error": "device_id is required"}), 400

    access_token = get_valid_access_token(device_id)
    if not access_token:
        return jsonify({"error": "not connected or token expired"}), 401

    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        # Get work stress data (reuse existing logic)
        end_dt = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=0)
        start_dt = end_dt - timedelta(days=6)

        # Fetch calendar events
        cal_url = 'https://graph.microsoft.com/v1.0/me/calendarView'
        cal_params = {
            'startDateTime': start_dt.isoformat(),
            'endDateTime': end_dt.isoformat(),
            '$select': 'subject,start,end,location,organizer',
            '$top': '1000',
        }
        cal_resp = requests.get(cal_url, headers=headers, params=cal_params)
        cal_data = cal_resp.json().get('value', []) if cal_resp.status_code == 200 else []

        # Fetch recent emails
        mail_url = 'https://graph.microsoft.com/v1.0/me/messages'
        email_start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        
        mail_params = {
            '$select': 'subject,receivedDateTime',
            '$orderby': 'receivedDateTime desc',
            '$top': '50'
        }
        mail_resp = requests.get(mail_url, headers=headers, params=mail_params)
        mail_data = mail_resp.json().get('value', []) if mail_resp.status_code == 200 else []

        # Filter emails for last 7 days
        filtered_emails = []
        for email in mail_data:
            try:
                received_dt = datetime.fromisoformat(email['receivedDateTime'].replace('Z', '+00:00'))
                if received_dt >= email_start_dt:
                    filtered_emails.append(email)
            except Exception:
                continue

        # Calculate work stress score (simplified version)
        total_meeting_hours = 0.0
        back_to_back_count = 0
        after_hours_emails = 0
        early_morning_meetings = 0

        # Process calendar events
        events_by_day = defaultdict(list)
        for ev in cal_data:
            try:
                s = ev.get('start', {}).get('dateTime')
                e = ev.get('end', {}).get('dateTime')
                if not s or not e:
                    continue
                sd = datetime.fromisoformat(s.replace('Z', '+00:00'))
                ed = datetime.fromisoformat(e.replace('Z', '+00:00'))
                day_key = sd.date().isoformat()
                events_by_day[day_key].append((sd, ed, ev))
            except Exception:
                continue

        # Calculate metrics
        for day_events in events_by_day.values():
            day_events.sort(key=lambda x: x[0])
            last_end = None
            for sd, ed, _ in day_events:
                dur = (ed - sd).total_seconds() / 3600.0
                total_meeting_hours += max(0.0, dur)
                if last_end is not None and (sd - last_end).total_seconds() <= 15 * 60:
                    back_to_back_count += 1
                last_end = ed
                if sd.time() < time(9, 0):
                    early_morning_meetings += 1

        # Process emails
        for email in filtered_emails:
            try:
                rd = datetime.fromisoformat(email['receivedDateTime'].replace('Z', '+00:00'))
                if rd.time() < time(7, 0) or rd.time() > time(19, 0):
                    after_hours_emails += 1
            except Exception:
                continue

        # Calculate work stress score
        def clamp(v, lo, hi):
            return max(lo, min(hi, v))

        work_stress_score = 0.0
        work_stress_score += clamp(total_meeting_hours / 6.0 * 5.0, 0.0, 5.0)
        work_stress_score += clamp(back_to_back_count * 0.5, 0.0, 2.0)
        work_stress_score += clamp(after_hours_emails * 0.3, 0.0, 2.0)
        work_stress_score += clamp(early_morning_meetings * 0.3, 0.0, 1.0)
        work_stress_score = clamp(work_stress_score * (10.0 / 10.0), 1.0, 10.0)

        # Calculate email activity score (inverse relationship - more emails = higher stress)
        email_activity_score = clamp(len(filtered_emails) * 0.2, 1.0, 10.0)

        # Calculate calendar busyness score
        calendar_busyness_score = clamp(total_meeting_hours * 1.5, 1.0, 10.0)

        # Calculate overall productivity score (combination of all factors)
        productivity_score = (work_stress_score + email_activity_score + calendar_busyness_score) / 3

        return jsonify({
            'work_stress': {
                'score': round(work_stress_score, 1),
                'level': 'Low' if work_stress_score < 4 else 'Moderate' if work_stress_score < 7 else 'High',
                'trend': 'down' if work_stress_score < 5 else 'stable' if work_stress_score < 7 else 'up'
            },
            'email_activity': {
                'score': round(email_activity_score, 1),
                'count': len(filtered_emails),
                'after_hours': after_hours_emails
            },
            'calendar_busyness': {
                'score': round(calendar_busyness_score, 1),
                'meeting_hours': round(total_meeting_hours, 1),
                'back_to_back_meetings': back_to_back_count,
                'early_morning_meetings': early_morning_meetings
            },
            'overall_productivity': {
                'score': round(productivity_score, 1),
                'level': 'Low' if productivity_score < 4 else 'Moderate' if productivity_score < 7 else 'High'
            },
            'period': 'week',
            'last_updated': datetime.now(timezone.utc).isoformat()
        })

    except Exception as e:
        logger.error(f"Error computing dashboard scores: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/debug-timezone', methods=['GET'])
def debug_timezone():
    """Debug endpoint to check timezone settings"""
    utc_now = datetime.now(timezone.utc)
    user_tz = request.args.get('timezone', 'UTC')
    
    user_now = get_user_datetime(user_tz)
    user_date = get_user_date(user_tz)
    
    return jsonify({
        "utc_time": utc_now.isoformat(),
        "user_timezone": user_tz,
        "user_time": user_now.isoformat(),
        "user_date": user_date,
        "utc_date": utc_now.date().isoformat(),
        "date_comparison": {
            "user_date": user_date,
            "utc_date": utc_now.date().isoformat(),
            "same": user_date == utc_now.date().isoformat()
        },
        "available_timezones": [
            "UTC", "America/New_York", "Europe/London", 
            "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"
        ]
    })

# ---------------- Run ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

# -------------------------------------------------------------------------------

