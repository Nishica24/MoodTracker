from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime, timezone
from flask_pymongo import PyMongo

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

        logger.info("Pushing data to database : ")

        db.Mood_Score.insert_one({
            "user_id:": user_id,
            "mood": mood,
            "mood_level": mood_level,
            "mood_emoji": mood_emoji,
            "created_at": datetime.now(timezone.utc)
        })

        return jsonify({
            "mood": mood,
            "mood_level": mood_level,
            "emoji": mood_emoji,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"❌ Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500

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

