from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from datetime import datetime
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
# Add ONNX runtime imports
import onnxruntime as ort
import numpy as np
from transformers import AutoTokenizer

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for mobile app

# Configure MongoDB URI for flask_pymongo
app.config["MONGO_URI"] = "mongodb+srv://nishica22210402:UW1Gy7gzbdwPR0WG@cluster0.0gblwuc.mongodb.net/Mood_Tracker?retryWrites=true&w=majority&appName=Cluster0"
mongo = PyMongo(app)

# Get database and collection references
db = mongo.db
collection = db.MT  # collection (like a table)

# Global variables for ONNX model
onnx_session = None
tokenizer = None

# Real RoBERTa emotion classifier
def roberta_emotion_analysis(text):
    """Real emotion analysis using ONNX model"""
    global onnx_session, tokenizer
    
    if not onnx_session or not tokenizer:
        logger.error("Model or tokenizer not loaded")
        return None
    
    try:
        # Tokenize input
        inputs = tokenizer(text, return_tensors="np", padding=True, truncation=True, max_length=512)
        
        # Get input names from the model
        input_names = [input.name for input in onnx_session.get_inputs()]
        output_name = onnx_session.get_outputs()[0].name
        
        # Prepare input dictionary
        input_dict = {}
        if 'input_ids' in input_names:
            input_dict['input_ids'] = inputs['input_ids']
        if 'attention_mask' in input_names:
            input_dict['attention_mask'] = inputs['attention_mask']
        
        logger.info(f"Running inference with input keys: {list(input_dict.keys())}")
        
        # Run inference
        outputs = onnx_session.run([output_name], input_dict)
        
        # Process outputs
        scores = outputs[0][0]  # Get first batch, first sequence
        
        logger.info(f"Raw scores shape: {outputs[0].shape}")
        logger.info(f"Score range: min={scores.min():.4f}, max={scores.max():.4f}")
        logger.info(f"Top 5 raw scores: {scores[:5]}")
        
        # Create emotion labels (adjust these to match your training)
        # You should update this list to match the exact emotions you trained on
        emotions = [
            "admiration", "amusement", "anger", "annoyance", "approval", "caring", 
            "confusion", "curiosity", "desire", "disappointment", "disapproval", 
            "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief", 
            "joy", "love", "nervousness", "optimism", "pride", "realization", 
            "relief", "remorse", "sadness", "surprise", "neutral"
        ]
        
        # Ensure we have the right number of emotions
        if len(scores) != len(emotions):
            logger.warning(f"Model output has {len(scores)} classes but emotions list has {len(emotions)}")
            # Create generic labels if mismatch
            emotions = [f"emotion_{i}" for i in range(len(scores))]
        
        # Check if scores are logits (need softmax) or probabilities
        score_sum = np.sum(scores)
        if score_sum > 1.1:  # Likely logits, apply softmax
            logger.info("Scores appear to be logits, applying softmax")
            scores = np.exp(scores) / np.sum(np.exp(scores))
        elif score_sum < 0.9:  # Likely already probabilities
            logger.info("Scores appear to be probabilities")
        else:
            logger.info("Scores are close to 1, may need normalization")
        
        # Format scores
        formatted_scores = []
        for i, score in enumerate(scores):
            formatted_scores.append({
                "emotion": emotions[i],
                "confidence": round(float(score), 4),
                "percentage": round(float(score) * 100, 2)
            })
        
        # Sort by confidence
        formatted_scores.sort(key=lambda x: x['confidence'], reverse=True)
        
        logger.info(f"Top emotion: {formatted_scores[0]['emotion']} ({formatted_scores[0]['percentage']}%)")
        
        return formatted_scores
        
    except Exception as e:
        logger.error(f"Error during ONNX inference: {e}")
        return None

def load_onnx_model():
    """Load the ONNX emotion detection model"""
    global onnx_session, tokenizer
    try:
        # Get the current directory (Backend folder)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "Models", "model.onnx")
        
        # Check if model file exists
        if not os.path.exists(model_path):
            logger.error(f"Model file not found at: {model_path}")
            return False
        
        # Load ONNX model
        onnx_session = ort.InferenceSession(model_path)
        
        # Load tokenizer (you'll need this from your training)
        # Update this to match the tokenizer you used during training
        tokenizer = AutoTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")
        
        logger.info(f"✅ ONNX model loaded successfully from: {model_path}")
        logger.info(f"✅ Tokenizer loaded successfully")
        logger.info(f"✅ Model inputs: {[input.name for input in onnx_session.get_inputs()]}")
        logger.info(f"✅ Model outputs: {[output.name for output in onnx_session.get_outputs()]}")
        return True
    except Exception as e:
        logger.error(f"❌ Error loading ONNX model: {e}")
        return False



@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model_loaded": onnx_session is not None,
        "tokenizer_loaded": tokenizer is not None,
        "message": "ONNX Mood Analysis API is running" if onnx_session else "Mock Mood Analysis API is running (ONNX failed to load)"
    })

@app.route('/generate-mood-score', methods=['POST'])
def generate_mood_score():
    """Generate mood scores based on user goals and concerns"""
    
    try:
        # Get JSON data from the request
        data = request.get_json()
        logger.info(f"Received data: {data}")

        # Validate input data
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        goals = data.get('goals', [])
        concerns = data.get('concerns', [])
        
        if not goals and not concerns:
            return jsonify({"error": "At least one goal or concern is required"}), 400

        # Create descriptive text for analysis
        if goals and concerns:
            text_to_analyze = f"My wellness goals include: {', '.join(goals)}. I'm also dealing with: {', '.join(concerns)}."
        elif goals:
            text_to_analyze = f"My wellness goals include: {', '.join(goals)}."
        else:
            text_to_analyze = f"I'm dealing with: {', '.join(concerns)}."

        logger.info(f"Analyzing text: {text_to_analyze}")

        # Check if model is loaded
        if not onnx_session:
            return jsonify({
                "error": "ONNX model not loaded",
                "success": False
            }), 500

        # Generate emotion predictions using ONNX model
        mood_scores = roberta_emotion_analysis(text_to_analyze)
        if not mood_scores:
            logger.error("ONNX model failed to generate predictions")
            return jsonify({
                "error": "Model inference failed",
                "success": False
            }), 500
        logger.info(f"Generated {len(mood_scores)} emotion scores")
        
        # Get top 5 emotions
        top_emotions = mood_scores[:5]
        # logger.info(mood_scores)
        
        return jsonify({
            "success": True,
            "mood_scores": mood_scores,
            "top_emotions": top_emotions,
            "analyzed_text": text_to_analyze,
            "total_emotions": len(mood_scores),
            "note": "Real emotion analysis using your trained ONNX model"
        })

    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return jsonify({
            "error": f"Failed to generate mood score: {str(e)}",
            "success": False
        }), 500

@app.route('/model-status', methods=['GET'])
def model_status():
    """Check model loading status"""
    return jsonify({
        "model_loaded": onnx_session is not None,
        "tokenizer_loaded": tokenizer is not None,
        "status": "onnx_ready" if onnx_session else "model_failed",
        "note": "Using your trained ONNX emotion analysis model" if onnx_session else "ONNX model failed to load"
    })

@app.route('/debug-model', methods=['POST'])
def debug_model():
    """Debug endpoint to test model with specific text"""
    try:
        data = request.get_json()
        text = data.get('text', 'I am feeling happy today!')
        
        if not onnx_session:
            return jsonify({"error": "Model not loaded"}), 500
            
        # Get raw model outputs
        inputs = tokenizer(text, return_tensors="np", padding=True, truncation=True, max_length=512)
        input_names = [input.name for input in onnx_session.get_inputs()]
        output_name = onnx_session.get_outputs()[0].name
        
        input_dict = {}
        if 'input_ids' in input_names:
            input_dict['input_ids'] = inputs['input_ids']
        if 'attention_mask' in input_names:
            input_dict['attention_mask'] = inputs['attention_mask']
        
        outputs = onnx_session.run([output_name], input_dict)
        raw_scores = outputs[0][0]
        
        # Get model info
        model_info = {
            "input_names": input_names,
            "output_names": [output.name for output in onnx_session.get_outputs()],
            "input_shapes": {name: onnx_session.get_inputs()[i].shape for i, name in enumerate(input_names)},
            "output_shapes": {name: onnx_session.get_outputs()[i].shape for i, name in enumerate(onnx_session.get_outputs())}
        }
        
        return jsonify({
            "text": text,
            "raw_scores": raw_scores.tolist(),
            "score_range": {"min": float(raw_scores.min()), "max": float(raw_scores.max())},
            "model_info": model_info,
            "tokenizer_info": {
                "vocab_size": tokenizer.vocab_size,
                "model_max_length": tokenizer.model_max_length
            }
        })
        
    except Exception as e:
        logger.error(f"Debug error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/test-mood', methods=['GET'])
def test_mood():
    """Test endpoint with different mood scenarios"""
    test_cases = [
        "I am feeling very happy and excited today!",
        "I am feeling sad and disappointed about work",
        "I am feeling angry and frustrated with the situation",
        "I am feeling anxious and worried about the future",
        "I am feeling grateful and content with my life"
    ]
    
    results = []
    for text in test_cases:
        try:
            mood_scores = roberta_emotion_analysis(text)
            if mood_scores:
                top_emotion = mood_scores[0]
                results.append({
                    "text": text,
                    "top_emotion": top_emotion["emotion"],
                    "confidence": top_emotion["confidence"]
                })
            else:
                results.append({
                    "text": text,
                    "error": "Analysis failed"
                })
        except Exception as e:
            results.append({
                "text": text,
                "error": str(e)
            })
    
    return jsonify({
        "test_results": results,
        "note": "These are test cases to verify model behavior"
    })

    # --- NEW: Database Endpoints for Logging and Retrieving Mood/Activity Data ---

@app.route('/log-activity', methods=['POST'])
def log_activity():
    """Receives and stores mood score and call log metrics from the mobile app."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    user_id = data.get('userId')
    mood_score = data.get('moodScore')
    activity_data = data.get('activityData')

    if not all([user_id, mood_score is not None, activity_data]):
        return jsonify({"error": "Missing required fields: userId, moodScore, activityData"}), 400

    # The 'activity_logs' collection will be created automatically if it doesn't exist
    activity_logs_collection = mongo.db.activity_logs
    try:
        # Insert the complete data payload into the collection
        result = activity_logs_collection.insert_one({
            "userId": user_id,
            "moodScore": mood_score,
            "activityData": activity_data,
            "timestamp": datetime.utcnow()
        })
        logger.info(f"Logged activity for user {user_id} with db id {result.inserted_id}")
        # Convert ObjectId to string for the JSON response
        return jsonify({"message": "Activity logged successfully!", "id": str(result.inserted_id)}), 201
    except Exception as e:
        logger.error(f"Database error on /log-activity: {e}")
        return jsonify({"error": "Could not save log entry"}), 500

@app.route('/get-activity-logs/<userId>', methods=['GET'])
def get_activity_logs(userId):
    if not userId:
        return jsonify({"error": "User ID is required"}), 400

    try:
        activity_logs_collection = mongo.db.activity_logs
        # Find all documents matching the userId and sort by timestamp descending
        logs = activity_logs_collection.find({"userId": userId}).sort("timestamp", -1)
        
        results = []
        for log in logs:
            # Important: Convert the '_id' (ObjectId) to a string to make it JSON serializable
            log['_id'] = str(log['_id'])
            results.append(log)

        logger.info(f"Retrieved {len(results)} logs for user {userId}")
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Database error on /get-activity-logs: {e}")
        return jsonify({"error": "Could not retrieve logs"}), 500

if __name__ == '__main__':
    # Start the server
    logger.info("🚀 Starting Mood Analysis Server...")
    
    # Try to load ONNX model
    if load_onnx_model():
        logger.info("✅ Server ready! Your ONNX model loaded successfully.")
    else:
        logger.error("❌ ONNX model failed to load. Server cannot start without the model.")
        logger.info("📝 Please ensure your model is placed at 'Backend/Models/model.onnx'")
        exit(1)
    
    logger.info("📝 Server starting with ONNX model capabilities...")
    
    # Run the server
    # Use 0.0.0.0 to make it accessible from other devices on the network
    app.run(
        host='0.0.0.0', 
        port=5001, 
        debug=True,
        threaded=True
    )