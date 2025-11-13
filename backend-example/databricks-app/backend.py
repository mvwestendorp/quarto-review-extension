#!/usr/bin/env python3
"""
Databricks App Backend for Quarto Review Extension

This Flask application serves as the backend for the Quarto Review Extension
when deployed as a Databricks App.

It provides:
1. Static file serving for HTML/CSS/JS
2. `/api/userinfo` endpoint for authentication
3. User authentication via Databricks-forwarded headers

The Databricks App runtime automatically forwards the authenticated user's
access token and identity information via HTTP headers:
  - x-forwarded-access-token: OAuth token
  - x-forwarded-user: Username/email
"""

import json
import logging
from typing import Optional, Dict, Any
from flask import Flask, request, jsonify
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('DatabricksApp')

app = Flask(
    __name__,
    static_folder='../../site/_output',
    static_url_path='/'
)


@app.route('/api/userinfo', methods=['GET'])
def get_user_info() -> tuple[Dict[str, Any], int]:
    """
    Get authenticated user information

    Databricks forwards user identity via these headers:
    - x-forwarded-access-token: OAuth token for the authenticated user
    - x-forwarded-user: Username/email of the authenticated user

    Returns:
        JSON with user info if authenticated, error otherwise
    """
    try:
        # Get headers forwarded by Databricks
        user_token = request.headers.get('x-forwarded-access-token')
        forwarded_user = request.headers.get('x-forwarded-user')

        logger.debug(f'User info request - token present: {bool(user_token)}, user: {forwarded_user}')

        # Check if we have authentication
        if not user_token:
            logger.warning('No x-forwarded-access-token header found')
            return jsonify({
                'authenticated': False,
                'error': 'No authentication token provided'
            }), 401

        if not forwarded_user:
            logger.warning('No x-forwarded-user header found')
            return jsonify({
                'authenticated': False,
                'error': 'No user identity provided'
            }), 401

        # Parse user email from forwarded user header
        user_email = forwarded_user
        if '@' not in user_email:
            # Might be username only, append default domain if needed
            # You can customize this based on your Databricks setup
            user_email = f'{forwarded_user}@databricks.com'

        logger.info(f'User authenticated: {forwarded_user}')

        return jsonify({
            'authenticated': True,
            'userId': forwarded_user,
            'email': user_email,
            'displayName': forwarded_user,
            'role': 'editor',  # You can add logic to determine role from groups
            'source': 'databricks-app'
        }), 200

    except Exception as e:
        logger.error(f'Error in userinfo endpoint: {str(e)}', exc_info=True)
        return jsonify({
            'authenticated': False,
            'error': f'Server error: {str(e)}'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check() -> tuple[Dict[str, str], int]:
    """
    Health check endpoint for Kubernetes/Databricks monitoring
    """
    return jsonify({
        'status': 'healthy',
        'service': 'quarto-review-extension'
    }), 200


@app.route('/', methods=['GET'])
def index():
    """
    Serve index.html for SPA routing
    """
    return app.send_static_file('index.html')


@app.route('/<path:path>', methods=['GET'])
def serve_static(path: str):
    """
    Serve static files (HTML, CSS, JS, images)
    Fall back to index.html for SPA routes
    """
    if path.startswith('api/'):
        # Don't serve API routes as static files
        return jsonify({'error': 'Not found'}), 404

    # Try to serve the file
    full_path = os.path.join(app.static_folder, path)
    if os.path.isfile(full_path):
        return app.send_static_file(path)

    # Fall back to index.html for SPA routing
    return app.send_static_file('index.html')


@app.errorhandler(404)
def not_found(error):
    """
    Handle 404 errors - return index.html for SPA
    """
    return app.send_static_file('index.html')


@app.errorhandler(500)
def server_error(error):
    """
    Handle 500 errors
    """
    logger.error(f'Server error: {str(error)}')
    return jsonify({
        'error': 'Internal server error',
        'message': str(error)
    }), 500


if __name__ == '__main__':
    # Get port from environment or default to 8080
    port = int(os.getenv('PORT', 8080))

    # Get debug flag from environment
    debug = os.getenv('DEBUG', 'false').lower() == 'true'

    logger.info(f'Starting Quarto Review Extension backend on port {port}')
    logger.info(f'Debug mode: {debug}')

    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
