from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime, timezone, timedelta, time
from flask_pymongo import PyMongo
from collections import defaultdict

# ---------------- App Setup ----------------
app = Flask(__name__)
CORS(app)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------- MongoDB Connection ----------------

# Configure MongoDB URI for flask_pymongo
app.config["MONGO_URI"] = "mongodb+srv://nishica22210402:UW1Gy7gzbdwPR0WG@cluster0.0gblwuc.mongodb.net/Mood_Tracker?retryWrites=true&w=majority&appName=Cluster0"
mongo = PyMongo(app)

# Get database
db = mongo.db

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

# ---------------- Run ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

# -------------------------------------------------------------------------------

