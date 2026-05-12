# AI Agent Website

A modern web application for chatting with an AI agent powered by GPT-4o via AIML API.

## Project Structure

```
agent/
├── backend/          # Flask API server
│   ├── app.py       # Main Flask application
│   └── requirements.txt
└── frontend/        # HTML/CSS/JavaScript frontend
    ├── index.html   # Main page
    ├── styles.css   # Styling
    └── script.js    # Client-side logic
```

## Features

- 💬 Real-time chat interface with AI agent
- 🤖 Powered by GPT-4o model
- 🔒 Secure API key handling (key stored in backend only)
- 📱 Responsive design for desktop and mobile
- ⚡ Fast and intuitive user experience
- 🎨 Beautiful gradient UI

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- A modern web browser

### Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python app.py
   ```

   You should see output like:
   ```
   * Running on http://localhost:5000
   * WARNING: This is a development server. Do not use it in production.
   ```

### Frontend Setup

1. Open the `frontend/index.html` file in your web browser:
   - Double-click the file, or
   - Open it with your preferred browser, or
   - Use a live server extension in VS Code

   The frontend will connect to the backend API running on `http://localhost:5000`

## API Key

- The AIML API key (`7f349cb65416fdb39a9241df0f962134`) is securely stored in the backend
- The frontend never has direct access to the API key
- All requests go through the Flask API, which handles authentication

## API Endpoints

### `GET /api/health`
Check if the backend server is running.

**Response:**
```json
{
  "status": "healthy"
}
```

### `POST /api/chat`
Send a message to the AI agent.

**Request:**
```json
{
  "message": "Your message here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "AI response here"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Usage

1. Make sure the backend server is running (step 4 from Backend Setup)
2. Open `frontend/index.html` in your browser
3. Type your message in the input field
4. Click "Send" or press Enter to send the message
5. Wait for the AI agent to respond

## Troubleshooting

### Backend not responding error
- Make sure the Flask server is running on `http://localhost:5000`
- Check that the terminal shows "Running on http://localhost:5000"
- Try restarting the Flask server

### CORS errors
- Make sure `Flask-CORS` is installed (included in requirements.txt)
- The backend is configured to accept requests from the frontend

### API errors
- Check your internet connection
- Verify the API key is correct
- Check that the AIML API service is accessible

## Development

To modify the AI model or system prompt, edit `backend/app.py`:

```python
response = client.chat.completions.create(
    model="gpt-4o",  # Change model here
    messages=[{"role": "user", "content": user_message}]
)
```

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, check the API documentation at https://api.aimlapi.com
