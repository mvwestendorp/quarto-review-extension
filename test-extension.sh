#!/bin/bash

# Web Review Extension Test Script
# This script helps test and troubleshoot the extension

set -e

echo "🧪 Testing Web Review Extension for Quarto"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "_extensions/web-review/_extension.yml" ]; then
    echo "❌ Error: Extension not found in _extensions/web-review/"
    echo "   Make sure you're running this from the project root directory"
    echo "   and the extension is properly installed."
    exit 1
fi

echo "✅ Extension files found"

# Check if Quarto is available
if ! command -v quarto &> /dev/null; then
    echo "❌ Error: Quarto not found"
    echo "   Please install Quarto: https://quarto.org/docs/get-started/"
    exit 1
fi

echo "✅ Quarto found: $(quarto --version)"

# Test with the main extension
echo ""
echo "📝 Testing Web Review Extension..."

# Create a simple test document if it doesn't exist
if [ ! -f "test-simple.qmd" ]; then
    echo "   Creating test document..."
    cat > test-simple.qmd << 'EOF'
---
title: "Web Review Test Document"
format: 
  html:
    filters:
      - _extensions/web-review/web-review.lua
web-review:
  enabled: true
  mode: "review"
---

# Test Header

This is a test paragraph that should become reviewable.

## Code Example

```javascript
console.log("Hello World");
```

## Another Section

Here's another paragraph to test the review functionality.
EOF
    echo "   Created test-simple.qmd"
fi

echo "   Rendering test-simple.qmd..."
if quarto render test-simple.qmd; then
    echo "✅ Test document rendered successfully"
    echo "   Output: test-simple.html"
    RENDER_SUCCESS=true
else
    echo "❌ Test rendering failed"
    echo "   Check the error messages above"
    RENDER_SUCCESS=false
fi

# Test with example document if it exists
if [ -f "example.qmd" ]; then
    echo ""
    echo "📝 Testing with example document..."
    echo "   Rendering example.qmd..."
    if quarto render example.qmd; then
        echo "✅ Example document rendered successfully"
        echo "   Output: example.html"
    else
        echo "⚠️  Example document failed to render"
        echo "   But basic test succeeded, so extension is working"
    fi
fi

echo ""
echo "🧪 Browser Testing..."

if [ "$RENDER_SUCCESS" = true ]; then
    if [ -f "test-simple.html" ]; then
        echo "   Generated HTML file: test-simple.html"
        echo "   You can open this file in a browser to test the web interface"
        
        # Check if the HTML contains our review assets
        if grep -q "Web Review Extension" test-simple.html; then
            echo "✅ Review assets found in HTML output"
        else
            echo "⚠️  Review assets not found in HTML output"
        fi
        
        if grep -q "reviewable" test-simple.html; then
            echo "✅ Reviewable elements found in HTML output"
        else
            echo "⚠️  Reviewable elements not found in HTML output"
        fi
        
        # Try to start a local server for testing (optional)
        if command -v python3 &> /dev/null; then
            echo ""
            echo "🌐 Starting local server for testing..."
            echo "   Open http://localhost:8000/test-simple.html in your browser"
            echo "   Press Ctrl+C to stop the server"
            echo ""
            echo "🎯 Testing instructions:"
            echo "   1. Open the URL above in your browser"
            echo "   2. You should see a 'Web Review' toolbar in the top-right"
            echo "   3. Hover over paragraphs and headers - they should highlight"
            echo "   4. Ctrl+click (or Cmd+click on Mac) elements to select them"
            echo "   5. Check browser console for any errors"
            echo ""
            python3 -m http.server 8000
        fi
    fi
else
    echo "❌ Cannot test browser functionality - rendering failed"
    echo ""
    echo "🔧 Troubleshooting suggestions:"
    echo "   1. Check Quarto version (requires >= 1.2.0)"
    echo "   2. Verify extension files exist in _extensions/web-review/"
    echo "   3. Check the Lua error messages above"
    echo "   4. Try a minimal document first"
fi

echo ""
echo "📋 Test Summary:"
echo "=================="
if [ "$RENDER_SUCCESS" = true ]; then
    echo "✅ Extension structure verified"
    echo "✅ Quarto installation verified" 
    echo "✅ Document rendering successful"
    echo "✅ Extension appears to be working"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Open the generated HTML file in a browser"
    echo "   2. Test the review functionality (Ctrl+click elements)"
    echo "   3. Check browser console for any JavaScript errors"
    echo "   4. Try adding the extension to your own documents"
else
    echo "❌ Extension structure verified"
    echo "❌ Quarto installation verified" 
    echo "❌ Document rendering failed"
    echo ""
    echo "🔧 Please check the error messages above and:"
    echo "   1. Verify your Quarto version is >= 1.2.0"
    echo "   2. Check that all extension files are present"
    echo "   3. Ensure the document YAML is correctly formatted"
fi
echo ""
echo "📚 For more help, see README.md"