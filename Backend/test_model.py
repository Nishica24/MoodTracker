#!/usr/bin/env python3
"""
Test script to verify ONNX model loading and inference
Run this before starting the server to ensure everything works
"""

import os
import sys
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

def test_model_loading():
    """Test if the ONNX model can be loaded successfully"""
    print("🧪 Testing ONNX model loading...")
    
    try:
        # Get the current directory (Backend folder)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "Models", "model.onnx")
        
        print(f"📁 Looking for model at: {model_path}")
        
        # Check if model file exists
        if not os.path.exists(model_path):
            print(f"❌ Model file not found at: {model_path}")
            return False
        
        print(f"✅ Model file found!")
        
        # Load ONNX model
        print("🔄 Loading ONNX model...")
        onnx_session = ort.InferenceSession(model_path)
        print("✅ ONNX model loaded successfully!")
        
        # Print model information
        print(f"📊 Model inputs: {[input.name for input in onnx_session.get_inputs()]}")
        print(f"📊 Model outputs: {[output.name for output in onnx_session.get_outputs()]}")
        
        # Get input shapes
        for input_info in onnx_session.get_inputs():
            print(f"📥 Input '{input_info.name}' shape: {input_info.shape}")
        
        # Get output shapes
        for output_info in onnx_session.get_outputs():
            print(f"📤 Output '{output_info.name}' shape: {output_info.shape}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading ONNX model: {e}")
        return False

def test_tokenizer():
    """Test if the tokenizer can be loaded successfully"""
    print("\n🧪 Testing tokenizer loading...")
    
    try:
        # Load tokenizer
        print("🔄 Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")
        print("✅ Tokenizer loaded successfully!")
        
        # Test tokenization
        test_text = "I am feeling happy and excited today!"
        print(f"📝 Testing tokenization with: '{test_text}'")
        
        inputs = tokenizer(test_text, return_tensors="np", padding=True, truncation=True, max_length=512)
        print(f"✅ Tokenization successful!")
        print(f"📊 Input IDs shape: {inputs['input_ids'].shape}")
        print(f"📊 Attention mask shape: {inputs['attention_mask'].shape}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading tokenizer: {e}")
        return False

def test_inference():
    """Test if the model can perform inference"""
    print("\n🧪 Testing model inference...")
    
    try:
        # Load model and tokenizer
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "Models", "model.onnx")
        onnx_session = ort.InferenceSession(model_path)
        tokenizer = AutoTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")
        
        # Test text
        test_text = "I am feeling happy and excited today!"
        print(f"📝 Testing inference with: '{test_text}'")
        
        # Tokenize input
        inputs = tokenizer(test_text, return_tensors="np", padding=True, truncation=True, max_length=512)
        
        # Get input names from the model
        input_names = [input.name for input in onnx_session.get_inputs()]
        output_name = onnx_session.get_outputs()[0].name
        
        # Prepare input dictionary
        input_dict = {}
        if 'input_ids' in input_names:
            input_dict['input_ids'] = inputs['input_ids']
        if 'attention_mask' in input_names:
            input_dict['attention_mask'] = inputs['attention_mask']
        
        print(f"📥 Input keys: {list(input_dict.keys())}")
        
        # Run inference
        print("🔄 Running inference...")
        outputs = onnx_session.run([output_name], input_dict)
        
        # Process outputs
        scores = outputs[0][0]  # Get first batch, first sequence
        print(f"✅ Inference successful!")
        print(f"📊 Output shape: {outputs[0].shape}")
        print(f"📊 Number of emotion classes: {len(scores)}")
        print(f"📊 Top 5 scores: {scores[:5]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during inference: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting ONNX Model Tests...\n")
    
    # Test 1: Model loading
    model_loaded = test_model_loading()
    
    # Test 2: Tokenizer loading
    tokenizer_loaded = test_tokenizer()
    
    # Test 3: Inference (only if both above passed)
    inference_working = False
    if model_loaded and tokenizer_loaded:
        inference_working = test_inference()
    
    # Summary
    print("\n" + "="*50)
    print("📋 TEST SUMMARY")
    print("="*50)
    print(f"✅ Model Loading: {'PASS' if model_loaded else 'FAIL'}")
    print(f"✅ Tokenizer Loading: {'PASS' if tokenizer_loaded else 'FAIL'}")
    print(f"✅ Inference: {'PASS' if inference_working else 'FAIL'}")
    
    if model_loaded and tokenizer_loaded and inference_working:
        print("\n🎉 All tests passed! Your ONNX model is ready to use.")
        print("🚀 You can now start the server with: python server.py")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        if not model_loaded:
            print("💡 Make sure your model.onnx file is in the Backend/Models/ folder")
        if not tokenizer_loaded:
            print("💡 Check your internet connection for downloading the tokenizer")
        if not inference_working:
            print("💡 There might be a mismatch between your model and the expected input/output format")
    
    print("="*50)

if __name__ == "__main__":
    main()
