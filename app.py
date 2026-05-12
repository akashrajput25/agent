from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

# OpenRouter API Configuration
AIML_API_URL = "https://openrouter.ai/api/v1/chat/completions"
AIML_API_KEY = os.getenv("AIML_API_KEY")

@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        if not AIML_API_KEY:
            return jsonify({
                "success": False,
                "error": "API Key is missing. Please set the AIML_API_KEY environment variable."
            }), 500

        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
        
        # Make request to AIML API
        headers = {
            "Authorization": f"Bearer {AIML_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "minimax/minimax-m2.5:free",
            "messages": [{"role": "user", "content": user_message}],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        response = requests.post(AIML_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"API Error: {response.status_code} - {response.text}"
            }), 500
        
        response_data = response.json()
        ai_response = response_data['choices'][0]['message']['content']
        
        return jsonify({
            "success": True,
            "message": ai_response
        })
    
    except requests.exceptions.Timeout:
        return jsonify({
            "success": False,
            "error": "Request timed out. The AI service took too long to respond."
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            "success": False,
            "error": f"Network error: {str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
