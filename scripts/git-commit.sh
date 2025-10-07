#!/bin/bash

# Generate commit message based on changed files
changed_files=$(git diff --cached --name-only | head -5)
num_files=$(git diff --cached --name-only | wc -l | xargs)

if [ "$num_files" -eq 0 ]; then
  echo "No changes to commit"
  exit 1
fi

# Create commit message
if [ "$num_files" -eq 1 ]; then
  file=$(echo "$changed_files" | head -1)
  message="Update $file"
else
  message="Update $num_files files"
fi

# Add file list if small enough
if [ "$num_files" -le 5 ]; then
  message="$message

Modified:
$(echo "$changed_files" | sed 's/^/- /')"
fi

# Commit and push
git commit -m "$message" && git push

