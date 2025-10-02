#!/bin/bash

# Web Review Extension Installation Script
# Usage: ./install.sh [target-directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-$(pwd)}"
EXTENSION_DIR="$TARGET_DIR/_extensions"

echo "🚀 Installing Web Review Extension for Quarto"
echo "📁 Target directory: $TARGET_DIR"

# Create _extensions directory if it doesn't exist
if [ ! -d "$EXTENSION_DIR" ]; then
    echo "📂 Creating _extensions directory..."
    mkdir -p "$EXTENSION_DIR"
fi

# Copy the extension
echo "📋 Copying extension files..."
cp -r "$SCRIPT_DIR/_extensions/web-review" "$EXTENSION_DIR/"

# Verify installation
if [ -f "$EXTENSION_DIR/web-review/_extension.yml" ]; then
    echo "✅ Extension installed successfully!"
    echo ""
    echo "📝 To use the extension, add this to your Quarto document YAML:"
    echo ""
    echo "---"
    echo "title: \"Your Document\""
    echo "format:"
    echo "  html:"
    echo "    filters:"
    echo "      - _extensions/web-review/web-review.lua"
    echo "web-review:"
    echo "  enabled: true"
    echo "  mode: \"review\""
    echo "---"
    echo ""
    echo "🎯 Then render with: quarto render your-document.qmd"
    echo ""
    echo "📚 See README.md for full documentation and configuration options."
else
    echo "❌ Installation failed! Please check the source directory."
    exit 1
fi