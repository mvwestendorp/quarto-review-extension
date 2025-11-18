# Databricks App Deployment Guide

This guide explains how to deploy the Quarto Review Extension as a Databricks App.

## Overview

The Quarto Review Extension can be deployed in two ways:

1. **Kubernetes/Istio (Default)** - Uses nginx to inject OAuth2-proxy headers
2. **Databricks App (Optional)** - Uses a backend API to provide user authentication

This document covers the Databricks App deployment.

## Architecture

```
Databricks Workspace
    ↓ (user authenticates)
Databricks App Container
    ├─ Frontend: Quarto Review Extension (HTML/CSS/JS)
    └─ Backend: Flask server providing /api/userinfo endpoint
        ↓
        Reads x-forwarded-access-token header (from Databricks)
        ↓
        Returns user info to frontend
```

## Prerequisites

- Databricks workspace with admin access
- Python 3.9+
- Node.js 18+ (for building the extension)
- `databricks-cli` or Databricks SDK installed

## Step 1: Build the Extension

First, build the Quarto Review Extension frontend:

```bash
npm install
npm run build
# Output: site/_output/
```

This creates the static HTML/CSS/JS files that will be served by the backend.

## Step 2: Set Up the Backend

The backend is a simple Flask application that:
1. Serves static files (your built extension)
2. Provides `/api/userinfo` endpoint for authentication
3. Reads Databricks-forwarded headers

### Option A: Use the provided backend

Copy the example backend to your project:

```bash
cp -r backend-example/databricks-app ./my-app
cd my-app
```

### Option B: Integrate into your existing backend

Add this endpoint to your existing Flask/FastAPI application:

```python
from flask import Flask, request, jsonify

@app.route('/api/userinfo', methods=['GET'])
def get_user_info():
    # Databricks forwards user info via these headers
    user_token = request.headers.get('x-forwarded-access-token')
    forwarded_user = request.headers.get('x-forwarded-user')

    if not user_token or not forwarded_user:
        return jsonify({'authenticated': False}), 401

    return jsonify({
        'authenticated': True,
        'userId': forwarded_user,
        'email': forwarded_user,
        'role': 'editor'
    })
```

## Step 3: Create Databricks App

### Using Databricks CLI

```bash
# Login to Databricks workspace
databricks auth login --host https://your-workspace.cloud.databricks.com

# Create the app
databricks apps create \
  --app quarto-review \
  --description "Quarto Review Extension for collaborative document editing" \
  --config-path ./my-app/config.yaml
```

### Using Databricks Web UI

1. Go to your Databricks workspace
2. Navigate to **Apps** > **Create App**
3. Fill in the app details:
   - **Name**: `quarto-review`
   - **Description**: "Quarto Review Extension"
4. Choose the deployment method

## Step 4: Configure the App

Create `config.yaml`:

```yaml
app_name: quarto-review
description: Quarto Review Extension
source_code_path: ./my-app

# Python backend configuration
python:
  version: "3.11"
  requirements_file: requirements.txt
  entrypoint: backend.py

# Environment variables
env:
  PORT: 8080
  DEBUG: "false"

# Resources
resources:
  cpu_cores: 0.5
  memory_gb: 1
```

## Step 5: Deploy the App

```bash
# Deploy using Databricks CLI
databricks apps deploy \
  --app quarto-review \
  --config-path ./config.yaml

# Or through Databricks UI: Click "Deploy" button
```

## Step 6: Configure the Extension YAML

In your Quarto document, specify the Databricks authentication mode:

```yaml
---
title: "My Document"
review:
  user:
    auth:
      mode: databricks-app  # Use Databricks authentication
      databricks:
        endpoint: /api/userinfo  # Backend endpoint
        timeout: 5000  # Timeout in milliseconds
      debug: true  # Optional: enable debug logging
---
```

## Accessing Your App

Once deployed, Databricks will provide a URL like:

```
https://your-workspace.cloud.databricks.com/apps/quarto-review/index.html
```

Share this URL with your team. When they access it:

1. They must be logged into your Databricks workspace
2. Databricks automatically handles authentication
3. The app reads their identity from Databricks-forwarded headers
4. User appears as authenticated in the Quarto Review Extension

## How Authentication Works

### Request Flow

```
User Request
    ↓
Databricks App Gateway (validates workspace auth)
    ↓
Adds headers:
  - x-forwarded-access-token: user's OAuth token
  - x-forwarded-user: user's email/username
    ↓
Your Flask Backend
    ↓
/api/userinfo endpoint:
  Reads headers
  Returns user info JSON
    ↓
Browser JavaScript
    ↓
window.__authHeaders = { userId, email, role, ... }
    ↓
Quarto Review Extension
    ↓
Shows authenticated user in sidebar
```

### Headers Forwarded by Databricks

Databricks automatically forwards these headers to your app:

| Header | Value | Example |
|--------|-------|---------|
| `x-forwarded-access-token` | User's OAuth token | `token_xyz...` |
| `x-forwarded-user` | User's email/username | `alice@company.com` |

Your backend reads these and returns user info to the frontend.

## Testing Locally

To test the Databricks integration locally before deploying:

### 1. Simulate Databricks Headers

```python
# In your test or development code
import os
from flask import Flask
from werkzeug.test import Client

app = Flask(__name__)

# Simulate Databricks headers
headers = {
    'x-forwarded-access-token': 'fake-token-xyz',
    'x-forwarded-user': 'test@example.com'
}

client = Client(app)
response = client.get('/api/userinfo', headers=headers)
print(response.get_json())
# Should output: {
#   "authenticated": true,
#   "userId": "test@example.com",
#   "email": "test@example.com",
#   "role": "editor"
# }
```

### 2. Run Backend Locally

```bash
cd backend-example/databricks-app
pip install -r requirements.txt
python backend.py
```

Then access `http://localhost:8080` in your browser.

### 3. Test /api/userinfo Endpoint

```bash
# With Databricks headers
curl -H "x-forwarded-access-token: fake-token" \
     -H "x-forwarded-user: test@example.com" \
     http://localhost:8080/api/userinfo

# Should return:
# {
#   "authenticated": true,
#   "userId": "test@example.com",
#   "email": "test@example.com",
#   "role": "editor",
#   "source": "databricks-app"
# }

# Without headers
curl http://localhost:8080/api/userinfo
# Should return 401 with error
```

## Troubleshooting

### "User info request failed" in browser console

**Cause**: The `/api/userinfo` endpoint is not responding correctly

**Solution**:
1. Check backend logs: `databricks apps logs --app quarto-review`
2. Verify headers are being forwarded: Add debug logging in backend
3. Test endpoint directly with headers

### "Not authenticated" message in sidebar

**Cause**: Databricks headers not reaching the backend, or endpoint returning wrong format

**Solution**:
1. Check that `mode: databricks-app` is set in YAML
2. Verify endpoint returns JSON with `authenticated: true`
3. Check browser console for `/api/userinfo` request details

### App not starting

**Cause**: Python environment or dependencies issue

**Solution**:
1. Check `requirements.txt` has correct versions
2. Verify `backend.py` is in correct location
3. Check app logs: `databricks apps logs --app quarto-review --follow`

### CORS errors

**Cause**: Browser blocking requests due to CORS

**Solution**:
Add CORS headers to your Flask app:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
```

Then add to `requirements.txt`:
```
Flask-CORS==4.0.0
```

## Configuration Options

### Backend Configuration

The Flask backend accepts these environment variables:

```bash
# Port to run on (default: 8080)
PORT=8080

# Enable debug logging
DEBUG=true

# Databricks workspace URL (if needed for SDK calls)
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
```

### Extension Configuration (YAML)

```yaml
review:
  user:
    auth:
      # Required: must be 'databricks-app'
      mode: databricks-app

      # Optional: Databricks-specific configuration
      databricks:
        # API endpoint for user info (default: /api/userinfo)
        endpoint: /api/userinfo

        # Request timeout in milliseconds (default: 5000)
        timeout: 5000

      # Optional: enable debug logging
      debug: false
```

## Advanced: Custom User Roles

You can enhance the backend to determine user roles from Databricks groups:

```python
from databricks.sdk import WorkspaceClient

@app.route('/api/userinfo', methods=['GET'])
def get_user_info():
    user_token = request.headers.get('x-forwarded-access-token')
    forwarded_user = request.headers.get('x-forwarded-user')

    if not user_token:
        return jsonify({'authenticated': False}), 401

    # Optional: use Databricks SDK to get user groups
    try:
        w = WorkspaceClient(token=user_token)
        user = w.current_user.me()

        # Determine role based on groups
        groups = [g.display for g in (user.groups or [])]
        if 'admins' in groups:
            role = 'admin'
        elif 'editors' in groups:
            role = 'editor'
        else:
            role = 'viewer'
    except:
        # Fallback if SDK fails
        role = 'editor'

    return jsonify({
        'authenticated': True,
        'userId': forwarded_user,
        'email': forwarded_user,
        'role': role
    })
```

## Next Steps

1. Deploy to Databricks workspace
2. Share app URL with team
3. Users log in via Databricks
4. Start collaborating with Quarto Review Extension

## Support

For issues or questions:
- Check app logs: `databricks apps logs --app quarto-review --follow`
- Review Databricks Apps documentation: https://docs.databricks.com/en/dev-tools/apps/
- Open an issue on GitHub

## See Also

- [Kubernetes/Istio Deployment Guide](istio-oauth2-proxy-nginx-setup.md)
- [Authentication Modes](../src/modules/user/auth-init.ts)
- [Databricks Apps Documentation](https://docs.databricks.com/en/dev-tools/apps/)
