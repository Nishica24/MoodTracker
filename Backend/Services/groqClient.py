import json
import os
import asyncio
import re
from groq import AsyncGroq # Updated to AsyncGroq
from dotenv import load_dotenv

load_dotenv()

groq = AsyncGroq( # Updated to AsyncGroq
    api_key=os.environ.get("GROQ_API_KEY"),
)

async def generate_mood_report(mood_data, language='English'):
    print(f'Generating mood report for user data in language: {language}')

    # The prompt is now a Python f-string
    prompt = f"""
You are a mental wellness coach. A user has submitted their mood tracking data. Your task is to analyze this data to identify key trends, weekly insights, and provide actionable suggestions, just as if you were looking at a detailed graph of their habits.

Please respond ONLY with a JSON object in *{language}* with the following fields:

{{
  "weekly_insights": [],
  "improvement_suggestions": []
}}

Use the variable *{json.dumps(mood_data)}* in your response. It is a JSON object with the following structure:

{{
  "mood_patterns": {{
    "average_mood_score": number,
    "mood_fluctuations": string // (e.g., "stable", "volatile")
  }},
  "social_health": {{
    "daily_summaries": [
      {{
        "date": string,
        "outgoingCount": number,
        "incomingCount": number,
        "missedCount": number,
        "rejectedCount": number,
        "avgDuration": number,
        "uniqueContacts": number
      }}
    ]
  }},
  "spending_patterns": {{
    "spending_score": number,
    "spending_trends": string // (e.g., "high", "low", "unstable")
  }},
  "work_stress": {{
    "work_stress_score": number
  }},
  "sleep_pattern": {{
    "sleep_score": number,
    "average_hours": number,
    "sleep_tracking_access": boolean
  }},
  "screentime_usage": {{
    "screentime_score": number,
    "average_hours": number
  }}
}}

Use these values to guide the "weekly_insights" and "improvement_suggestions" sections. For example:
- *Analyze trends:* If *mood_patterns.mood_fluctuations* is "volatile" and *work_stress.work_stress_score* is high, suggest stress-management techniques.
- *Analyze data points:* If *sleep_pattern.sleep_score* is low and *screentime_usage.average_hours* is high, suggest reducing screen time before bed.
- *Analyze social health:* Analyze the daily trends in *outgoingCount, **incomingCount, and **missedCount. If **missedCount* or *rejectedCount* are high on certain days, suggest reaching out to those contacts. If *avgDuration* is consistently low, suggest longer, more meaningful conversations.
- *Note:* Consider the overall balance. If all scores are high but there is one low score (e.g., spending), highlight this as an area of focus.

⚠ Do not include any explanation, introduction, or translation — just return valid JSON.
Use very simple, easy-to-understand language.
Make sure suggestions are specific and actionable.
"""
    try:
        chat_completion = await groq.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile"
        )
        response = chat_completion.choices[0].message.content
        print(f"✅ Groq response: {response}")

        # Use regular expression to extract JSON object from markdown fences
        # This robustly finds content between the first { and the last }
        match = re.search(r'\{.*\}', response, re.DOTALL)
        
        if match:
            json_string = match.group(0)
            try:
                parsed_json = json.loads(json_string)
                print(f"✅ Successfully parsed JSON from Groq response")
                return parsed_json
            except json.JSONDecodeError as e:
                print(f"🔴 Failed to parse extracted JSON: {e}")
                print(f"🔴 Extracted JSON string: {json_string}")
                return {"error": "Failed to parse AI response", "raw": response}
        else:
            print("🔴 No JSON object found in the Groq response.")
            print(f"🔴 Full response: {response}")
            return {"error": "Invalid response format from AI", "raw": response}

    except Exception as err:
        print(f"🔴 GROQ ERROR: {err}")
        raise RuntimeError(f"Groq generationfailed:{err}")