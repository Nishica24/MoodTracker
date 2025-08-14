#!/usr/bin/env python3
"""
Debug script to test ONNX model loading and inference
"""

import onnxruntime as ort
import numpy as np
from transformers import AutoTokenizer
import os

def debug_onnx_model():
    print("🔍 Debugging ONNX Model...")
    
    # Check if model file exists
    model_path = "models/model.onnx"
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        print("Please place your model.onnx file in the models/ folder")
        return False
    
    print(f"✅ Model file found: {model_path}")
    
    try:
        # Load ONNX model
        print("📥 Loading ONNX model...")
        session = ort.InferenceSession(model_path)
        print("✅ ONNX model loaded successfully!")
        
        # Check model inputs
        print("\n📋 Model Inputs:")
        for input_info in session.get_inputs():
            print(f"  - Name: {input_info.name}")
            print(f"    Shape: {input_info.shape}")
            print(f"    Type: {input_info.type}")
        
        # Check model outputs
        print("\n📤 Model Outputs:")
        for output_info in session.get_outputs():
            print(f"  - Name: {output_info.name}")
            print(f"    Shape: {output_info.shape}")
            print(f"    Type: {output_info.type}")
        
        # Test with sample input
        print("\n🧪 Testing with sample input...")
        
        # Load tokenizer
        print("📥 Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")
        print("✅ Tokenizer loaded successfully!")
        
        # Sample text
        sample_text = "I am feeling anxious and stressed about work."
        print(f"📝 Sample text: {sample_text}")
        
        # Tokenize
        inputs = tokenizer(sample_text, return_tensors="np", padding=True, truncation=True, max_length=512)
        print(f"🔤 Tokenized input shape: {inputs['input_ids'].shape}")
        
        # Get input/output names
        input_name = session.get_inputs()[0].name
        attention_mask_name = session.get_inputs()[1].name
        output_name = session.get_outputs()[0].name
        
        print(f"📥 Input name: {input_name}")
        print(f"📥 Attention mask name: {attention_mask_name}")
        print(f"📤 Output name: {output_name}")
        
        # Run inference with both required inputs
        print("🚀 Running inference...")
        outputs = session.run([output_name], {
            input_name: inputs['input_ids'],
            attention_mask_name: inputs['attention_mask']
        })
        
        print(f"✅ Inference successful!")
        print(f"📊 Output shape: {outputs[0].shape}")
        print(f"📊 Output type: {type(outputs[0])}")
        print(f"📊 Output dtype: {outputs[0].dtype}")
        
        # Show first few scores
        scores = outputs[0][0]
        print(f"🎯 First 5 scores: {scores[:5]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_onnx_model()
