#!/bin/bash

# Set up PATH to include Homebrew and common Node.js locations
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls -1 $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"

# Read hook input from stdin
input=$(cat)

# Extract file_path from input
file_path=$(echo "$input" | grep -o '"file_path":"[^"]*"' | sed 's/"file_path":"\(.*\)"/\1/')

# Check if file is a TypeScript/TSX file
if [[ "$file_path" == *.ts ]] || [[ "$file_path" == *.tsx ]]; then
  # Change to project directory
  cd /Users/matifuentes/Workspace/cloudmate
  
  # Run ESLint fix on only the changed file
  npx eslint --fix "$file_path"
fi

# Exit successfully
exit 0


