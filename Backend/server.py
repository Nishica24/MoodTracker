from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Add ONNX runtime imports
import onnxruntime as ort
import numpy as np
from transformers import AutoTokenizer

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for mobile app

# Global variables for ONNX model
onnx_session = None
tokenizer = None

# Real RoBERTa emotion classifier
def roberta_emotion_analysis(text):
    """Real emotion analysis using RoBERTa model"""
    global onnx_session, tokenizer
    
    if not onnx_session or not tokenizer:
        return None
    
    try:
        # Tokenize input
        inputs = tokenizer(text, return_tensors="np", padding=True, truncation=True, max_length=512)
        
        # Run inference with both required inputs
        input_ids_name = onnx_session.get_inputs()[0].name  # input_ids
        attention_mask_name = onnx_session.get_inputs()[1].name  # attention_mask
        output_name = onnx_session.get_outputs()[0].name
        
        outputs = onnx_session.run([output_name], {
            input_ids_name: inputs['input_ids'],
            attention_mask_name: inputs['attention_mask']
        })
        
        # Process outputs (assuming 28 emotion classes)
        scores = outputs[0][0]  # Get first batch, first sequence
        
        # Create emotion labels (adjust these to match your training)
        emotions = [
            "admiration", "amusement", "anger", "annoyance", "approval", "caring", 
            "confusion", "curiosity", "desire", "disappointment", "disapproval", 
            "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief", 
            "joy", "love", "nervousness", "optimism", "pride", "realization", 
            "relief", "remorse", "sadness", "surprise", "neutral"
        ]
        
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
        return formatted_scores
        
    except Exception as e:
        logger.error(f"Error during RoBERTa inference: {e}")
        return None

def load_onnx_model():
    """Load the ONNX emotion detection model"""
    global onnx_session, tokenizer
    try:
        # Load ONNX model
        onnx_session = ort.InferenceSession("models/model.onnx")
        
        # Load tokenizer (you'll need this from your training)
        tokenizer = AutoTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")
        
        logger.info("✅ ONNX model loaded successfully!")
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

        # Generate emotion predictions using RoBERTa model
        mood_scores = roberta_emotion_analysis(text_to_analyze)
        if not mood_scores:
            logger.error("RoBERTa model failed to generate predictions")
            return jsonify({
                "error": "Model inference failed",
                "success": False
            }), 500
        logger.info(f"Generated {len(mood_scores)} emotion scores")
        
        # Get top 5 emotions
        top_emotions = mood_scores[:5]
        
        return jsonify({
            "success": True,
            "mood_scores": mood_scores,
            "top_emotions": top_emotions,
            "analyzed_text": text_to_analyze,
            "total_emotions": len(mood_scores),
            "note": "Real emotion analysis using your trained RoBERTa model"
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
        "status": "roberta_ready" if onnx_session else "model_failed",
        "note": "Using real RoBERTa emotion analysis" if onnx_session else "RoBERTa model failed to load"
    })

if __name__ == '__main__':
    # Start the server
    logger.info("🚀 Starting Mood Analysis Server...")
    
    # Try to load RoBERTa model
    if load_onnx_model():
        logger.info("✅ Server ready! RoBERTa model loaded successfully.")
    else:
        logger.error("❌ Server failed to load RoBERTa model. Cannot start without model.")
        exit(1)
    
    logger.info("📝 RoBERTa integration complete!")
    
    # Run the server
    # Use 0.0.0.0 to make it accessible from other devices on the network
    app.run(
        host='0.0.0.0', 
        port=5001, 
        debug=True,
        threaded=True
    )
