# Push Command

Run the complete deployment pipeline: test, commit, push, deploy, and verify.

## Steps to Execute

1. **Run Tests**: Execute the test suite with coverage
   ```bash
   npm test
   ```

2. **Run Pre-Deployment Checks**: Validate TypeScript, ESLint, and build
   ```bash
   npm run deploy:check
   ```

3. **Stage Changes**: Add all changes to git
   ```bash
   git add -A
   ```

4. **Commit Changes**: Create a commit with a descriptive message
   ```bash
   ./scripts/git-commit.sh
   ```

5. **Push to Remote**: Push commits to the remote repository
   ```bash
   git push
   ```

6. **Deploy to Fly.io**: Deploy the application
   ```bash
   npm run deploy:fly
   ```

7. **Verify Deployment**: Validate the deployment is working
   ```bash
   npm run validate:deployment
   ```

Execute each step sequentially. If any step fails, stop and report the error.

