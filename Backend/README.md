# Mood Tracker Backend

This backend provides emotion analysis using your trained ONNX model for the Mood Tracker mobile app.

## Setup

### 1. Install Dependencies

```bash
cd Backend
pip install -r requirements.txt
```

### 2. Place Your Model

Ensure your trained ONNX model is placed at:
```
Backend/Models/model.onnx
```

### 3. Test Your Model

Before starting the server, test if your model loads correctly:

```bash
python test_model.py
```

This will:
- ✅ Check if the model file exists
- ✅ Test model loading
- ✅ Test tokenizer loading
- ✅ Test inference capabilities

### 4. Start the Server

If all tests pass, start the server:

```bash
python server.py
```

The server will run on `http://0.0.0.0:5001`

## API Endpoints

### Health Check
- **GET** `/health` - Check server and model status

### Model Status
- **GET** `/model-status` - Check if ONNX model is loaded

### Mood Analysis
- **POST** `/generate-mood-score`
  - **Body**: JSON with `goals` and `concerns` arrays
  - **Response**: Emotion scores and analysis

## Example Usage

### Test the API

```bash
curl -X POST http://localhost:5001/generate-mood-score \
  -H "Content-Type: application/json" \
  -d '{
    "goals": ["improve mood", "reduce stress"],
    "concerns": ["work pressure", "lack of sleep"]
  }'
```

### Expected Response

```json
{
  "success": true,
  "mood_scores": [
    {
      "emotion": "optimism",
      "confidence": 0.85,
      "percentage": 85.0
    },
    // ... more emotions
  ],
  "top_emotions": [...],
  "analyzed_text": "My wellness goals include: improve mood, reduce stress. I'm also dealing with: work pressure, lack of sleep.",
  "total_emotions": 28,
  "note": "Real emotion analysis using your trained ONNX model"
}
```

## Troubleshooting

### Model Not Loading
- Check if `model.onnx` exists in `Backend/Models/` folder
- Ensure the model file is not corrupted
- Check the model format (should be ONNX)

### Tokenizer Issues
- Ensure internet connection for downloading tokenizer
- Check if the tokenizer matches your training setup

### Inference Errors
- Verify input/output format matches your training
- Check if the model expects different input names
- Ensure the number of emotion classes matches your training

### Dependencies
- Make sure all packages in `requirements.txt` are installed
- Use Python 3.8+ for compatibility

## Model Requirements

Your ONNX model should:
- Accept `input_ids` and `attention_mask` as inputs
- Output emotion probabilities (logits or softmax scores)
- Be compatible with the RoBERTa tokenizer

## Customization

### Emotion Labels
Update the `emotions` list in `server.py` to match your training data:

```python
emotions = [
    "your_emotion_1",
    "your_emotion_2",
    # ... add all emotions you trained on
]
```

### Tokenizer
If you used a different tokenizer during training, update the tokenizer loading line:

```python
tokenizer = AutoTokenizer.from_pretrained("your_tokenizer_name")
```

## Support

If you encounter issues:
1. Run `python test_model.py` to identify the problem
2. Check the server logs for detailed error messages
3. Verify your model format and training setup
