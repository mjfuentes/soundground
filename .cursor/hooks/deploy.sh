#!/bin/bash

# Set up PATH to include Homebrew and common Node.js locations
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls -1 $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"

# Read hook input from stdin
input=$(cat)

# Change to project directory
cd /Users/matifuentes/Workspace/cloudmate

# Run deployment pipeline
echo "Running pre-deployment checks..."
npm run deploy:check || exit 1

echo "Staging changes..."
git add -A || exit 1

echo "Creating commit..."
./scripts/git-commit.sh || exit 1

echo "Deploying to Fly.io..."
npm run deploy:fly || exit 1

echo "Validating deployment..."
npm run validate:deployment || exit 1

echo "Deployment complete!"
exit 0


