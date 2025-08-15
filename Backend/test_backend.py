#!/usr/bin/env python3
"""
Test script for the Mood Tracker Backend
Run this to test different endpoints and diagnose issues
"""

import requests
import json

BASE_URL = "http://localhost:5001"

def test_health():
    """Test health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Response: {json.dumps(response.json(), indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_model_status():
    """Test model status endpoint"""
    print("\n🔍 Testing model status...")
    try:
        response = requests.get(f"{BASE_URL}/model-status")
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Response: {json.dumps(response.json(), indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_mood_analysis(goals, concerns):
    """Test mood analysis with specific goals and concerns"""
    print(f"\n🧠 Testing mood analysis...")
    print(f"📝 Goals: {goals}")
    print(f"📝 Concerns: {concerns}")
    
    try:
        data = {
            "goals": goals,
            "concerns": concerns
        }
        response = requests.post(f"{BASE_URL}/generate-mood-score", json=data)
        print(f"✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"🎯 Top emotion: {result['top_emotions'][0]['emotion']}")
            print(f"📊 Confidence: {result['top_emotions'][0]['confidence']}")
            print(f"📝 Analyzed text: {result['analyzed_text']}")
        else:
            print(f"❌ Error response: {response.text}")
            
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_debug_model(text):
    """Test debug endpoint with specific text"""
    print(f"\n🔧 Testing debug endpoint...")
    print(f"📝 Text: {text}")
    
    try:
        data = {"text": text}
        response = requests.post(f"{BASE_URL}/debug-model", json=data)
        print(f"✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📊 Score range: {result['score_range']}")
            print(f"🎯 Top 5 raw scores: {result['raw_scores'][:5]}")
        else:
            print(f"❌ Error response: {response.text}")
            
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_different_scenarios():
    """Test different mood scenarios"""
    print("\n🧪 Testing different mood scenarios...")
    
    scenarios = [
        (["be happy"], [], "Positive goals"),
        ([], ["work stress"], "Negative concerns"),
        (["improve mood"], ["anxiety"], "Mixed goals and concerns"),
        (["achieve success"], ["fear of failure"], "Achievement focused"),
        ([], ["grief", "loss"], "Sad emotions")
    ]
    
    for goals, concerns, description in scenarios:
        print(f"\n--- {description} ---")
        test_mood_analysis(goals, concerns)

def main():
    """Main test function"""
    print("🚀 Starting Backend Tests...\n")
    
    # Test basic endpoints
    test_health()
    test_model_status()
    
    # Test specific mood analysis
    test_mood_analysis(["improve mood", "reduce stress"], ["work pressure"])
    
    # Test debug endpoint
    test_debug_model("I am feeling very happy and excited today!")
    
    # Test different scenarios
    test_different_scenarios()
    
    print("\n🎉 Testing complete!")

if __name__ == "__main__":
    main()
