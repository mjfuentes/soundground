#!/bin/bash

# Set up PATH to include Homebrew and npm binaries
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Read hook input from stdin
input=$(cat)

# Change to project directory
cd /Users/matifuentes/Workspace/cloudmate || exit 1

# Run deployment pipeline using full path to npm
# Redirect output to stderr so it doesn't interfere with hook JSON output
echo "Running pre-deployment checks..." >&2
/opt/homebrew/bin/npm run deploy:check >&2 || exit 1

echo "Staging changes..." >&2
git add -A >&2 || exit 1

echo "Creating commit..." >&2
./scripts/git-commit.sh >&2 || exit 1

echo "Deploying to Fly.io..." >&2
/opt/homebrew/bin/npm run deploy:fly >&2 || exit 1

echo "Validating deployment..." >&2
/opt/homebrew/bin/npm run validate:deployment >&2 || exit 1

echo "Deployment complete!" >&2
exit 0


