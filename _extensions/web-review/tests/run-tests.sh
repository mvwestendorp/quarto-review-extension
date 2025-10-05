#!/bin/bash
# Simple test runner using Python's built-in HTTP server

echo "Starting test server..."
echo "Open http://localhost:8888/test-runner.html in your browser"
echo "Press Ctrl+C to stop"

cd "$(dirname "$0")"
python3 -m http.server 8888
