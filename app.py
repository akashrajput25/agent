from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import hashlib
from functools import wraps

app = Flask(__name__, static_folder='frontend', static_url_path='')

# Allow local development frontends such as file://, Flask, VS Code Live Server,
# Vite, and other localhost ports to call the API.
CORS(app, resources={r"/api/*": {
    "origins": [
        r"http://localhost:\d+",
        r"http://127\.0\.0\.1:\d+",
        "null"
    ],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": False
}})
# Increase limit to 16MB to accommodate base64 encoded images
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# User Database Simulation
USERS_DB = "users.json"

def get_users():
    if not os.path.exists(USERS_DB):
        return {}
    with open(USERS_DB, 'r') as f:
        return json.load(f)

def save_users(users):
    with open(USERS_DB, 'w') as f:
        json.dump(users, f)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/api/register', methods=['POST'], strict_slashes=False)
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "error": "Email and password required"}), 400
    
    users = get_users()
    if email in users:
        return jsonify({"success": False, "error": "User already exists"}), 409
    
    users[email] = {
        "password": hash_password(password),
        "name": email.split('@')[0],
        "mobileNumber": None,  # Initialize new fields
        "age": None,
        "avatarId": "male-1"
    } # Closing curly brace for the dictionary
    save_users(users)
    return jsonify({"success": True, "message": "Registration successful"})

@app.route('/api/login', methods=['POST'], strict_slashes=False)
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    users = get_users()
    user = users.get(email)
    
    if user and user['password'] == hash_password(password): # Compare hashed incoming password
        return jsonify({
            "success": True, 
            "user": {
                "email": email,
                "name": user['name'],
                "mobileNumber": user.get('mobileNumber'), # Include mobileNumber and age
                "age": user.get('age'),
                "avatarId": user.get('avatarId', 'male-1')
            }
        })
    return jsonify({"success": False, "error": "Invalid email or password"}), 401

@app.route('/api/user/update', methods=['POST'], strict_slashes=False)
def update_user():
    data = request.json
    email = data.get('email')
    new_name = data.get('name')
    new_mobile_number = data.get('mobile_number') # New field
    new_age = data.get('age') # New field
    new_avatar_id = data.get('avatar_id')
    
    if not email: # Email is required for lookup
        return jsonify({"success": False, "error": "Email required for profile update"}), 400
    
    # At least one field should be provided for update
    if new_name is None and new_mobile_number is None and new_age is None and new_avatar_id is None:
        return jsonify({"success": False, "error": "No update data provided"}), 400
        
    users = get_users()
    if email in users:
        if new_name is not None:
            users[email]['name'] = new_name
        if new_mobile_number is not None:
            users[email]['mobileNumber'] = new_mobile_number
        if new_age is not None:
            users[email]['age'] = new_age
        if new_avatar_id is not None:
            users[email]['avatarId'] = new_avatar_id
            
        save_users(users)
        # Return updated user object
        return jsonify({"success": True, "user": {"email": email, "name": users[email]['name'], "mobileNumber": users[email].get('mobileNumber'), "age": users[email].get('age'), "avatarId": users[email].get('avatarId', 'male-1')}})
    return jsonify({"success": False, "error": "User not found"}), 404

# OpenRouter API Configuration
AIML_API_URL = "https://openrouter.ai/api/v1/chat/completions"
AIML_API_KEY = os.getenv("AIML_API_KEY")

if not AIML_API_KEY:
    # Using a direct raise here will stop the app on startup if key is missing
    raise ValueError("AIML_API_KEY environment variable not set. Please ensure it's in your .env file.")

@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/chat', methods=['POST'], strict_slashes=False)
def chat():
    try:
        if not AIML_API_KEY:
            return jsonify({
                "success": False,
                "error": "API Key is missing. Please set the AIML_API_KEY environment variable."
            }), 500

        data = request.json
        user_message = data.get('message', '')
        model = data.get('model', 'openrouter/auto')
        image_data = data.get('image')  # Expecting a base64 data URL
        assistant_options = data.get('assistantOptions') or {}
        
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
        
        headers = {
            "Authorization": f"Bearer {AIML_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000", # Required by OpenRouter to identify the request source
            "X-Title": "AI Agent Local"             # Optional: identifies your app in OpenRouter rankings
        }
        
        # Prepare content based on whether an image is provided
        if image_data:
            content = [
                {"type": "text", "text": user_message},
                {"type": "image_url", "image_url": {"url": image_data}}
            ]
        else:
            content = user_message

        mode = assistant_options.get('mode', 'balanced')
        tone = assistant_options.get('tone', 'friendly')
        response_length = assistant_options.get('length', 'normal')
        creativity = assistant_options.get('creativity', 55)

        try:
            creativity = max(0, min(100, int(creativity)))
        except (TypeError, ValueError):
            creativity = 55

        mode_instructions = {
            "balanced": "Be a balanced AI assistant: helpful, accurate, practical, and clear.",
            "coder": "Act as a senior software engineering assistant. Prioritize correctness, debugging help, clean code, and concrete implementation steps.",
            "teacher": "Act as a patient tutor. Explain concepts simply, use examples, and check understanding when useful.",
            "researcher": "Act as a careful research assistant. Separate facts from assumptions, organize findings, and mention uncertainty clearly.",
            "creative": "Act as a creative partner. Offer imaginative options while keeping the answer usable.",
            "productivity": "Act as a productivity coach. Turn vague goals into prioritized next actions, checklists, and decisions."
        }
        tone_instructions = {
            "friendly": "Use a warm, friendly tone.",
            "direct": "Use a concise, direct tone.",
            "professional": "Use a polished, professional tone.",
            "simple": "Use simple language and avoid unnecessary jargon."
        }
        length_instructions = {
            "short": "Keep the answer brief and high-signal.",
            "normal": "Use a moderate level of detail.",
            "detailed": "Provide a more detailed answer with useful context and examples."
        }

        system_prompt = (
            "You are MIKU (Multilingual Interactive Knowledge User-interface), "
            "a world-class AI assistant. "
            f"{mode_instructions.get(mode, mode_instructions['balanced'])} "
            f"{tone_instructions.get(tone, tone_instructions['friendly'])} "
            f"{length_instructions.get(response_length, length_instructions['normal'])}"
        )

        system_message = {
            "role": "system", 
            "content": system_prompt
        }

        max_tokens_by_length = {
            "short": 600,
            "normal": 1000,
            "detailed": 1600
        }

        payload = {
            "model": model,
            "messages": [system_message, {"role": "user", "content": content}],
            "temperature": round(0.2 + (creativity / 100) * 0.8, 2),
            "max_tokens": max_tokens_by_length.get(response_length, 1000)
        }
        
        response = requests.post(AIML_API_URL, headers=headers, json=payload, timeout=60)
        
        if response.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"API Error: {response.status_code} - {response.text}"
            }), 500
        
        response_data = response.json()
        raw_content = response_data['choices'][0]['message']['content']

        if isinstance(raw_content, list):
            ai_response_parts = []
            for item in raw_content:
                if isinstance(item, dict):
                    item_type = item.get('type')
                    if item_type == 'text':
                        ai_response_parts.append(item.get('text', ''))
                    elif item_type == 'image_url':
                        image_url = item.get('image_url', {}).get('url')
                        if image_url:
                            ai_response_parts.append(f"![image]({image_url})")
                    else:
                        if 'text' in item:
                            ai_response_parts.append(item['text'])
                        elif 'url' in item:
                            ai_response_parts.append(f"![image]({item['url']})")
                        else:
                            ai_response_parts.append(str(item))
                else:
                    ai_response_parts.append(str(item))
            ai_response = "\n\n".join([part for part in ai_response_parts if part])
        else:
            ai_response = str(raw_content)
        
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
