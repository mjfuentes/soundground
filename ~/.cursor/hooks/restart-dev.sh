#!/bin/bash

# Restart development server after file changes
# Only run in the cloudmate project

PROJECT_DIR="$HOME/Workspace/cloudmate"

# Check if we're in the right project
if [ "$PWD" = "$PROJECT_DIR" ]; then
  echo "🔄 Restarting dev server..."
  
  # Kill existing server on port 3000
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  
  # Wait a moment for the port to be released
  sleep 1
  
  # Start the dev server in the background
  cd "$PROJECT_DIR"
  npm run dev > /dev/null 2>&1 &
  
  echo "✅ Dev server restarted"
fi

