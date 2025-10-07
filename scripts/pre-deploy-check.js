#!/usr/bin/env node

/**
 * Pre-deployment validation script
 * Runs checks before deploying to Fly.io
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkStep(name, fn) {
  try {
    log(`\n🔍 ${name}...`, colors.blue);
    fn();
    log(`✅ ${name} passed`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${name} failed: ${error.message}`, colors.red);
    return false;
  }
}

// Validation checks
const checks = [
  {
    name: 'TypeScript type checking',
    fn: () => {
      execSync('npm run type-check', { stdio: 'inherit' });
    },
  },
  {
    name: 'ESLint validation',
    fn: () => {
      execSync('npm run lint', { stdio: 'inherit' });
    },
  },
  {
    name: 'Build verification',
    fn: () => {
      log('  Building project...', colors.yellow);
      execSync('npm run build', { stdio: 'inherit' });
      
      // Check if .next directory exists
      const nextDir = path.join(process.cwd(), '.next');
      if (!fs.existsSync(nextDir)) {
        throw new Error('.next build directory not found');
      }
    },
  },
  {
    name: 'Fly.io CLI check',
    fn: () => {
      try {
        execSync('flyctl version', { stdio: 'pipe' });
        log('  Fly.io CLI is installed', colors.green);
      } catch {
        throw new Error('Fly.io CLI not found. Install it with: curl -L https://fly.io/install.sh | sh');
      }
    },
  },
  {
    name: 'Fly.io authentication',
    fn: () => {
      try {
        execSync('flyctl auth whoami', { stdio: 'pipe' });
        log('  Authenticated with Fly.io', colors.green);
      } catch {
        throw new Error('Not authenticated with Fly.io. Run: flyctl auth login');
      }
    },
  },
  {
    name: 'Fly.io app existence',
    fn: () => {
      const flyToml = path.join(process.cwd(), 'fly.toml');
      if (!fs.existsSync(flyToml)) {
        throw new Error('fly.toml not found');
      }
      
      // Parse app name from fly.toml
      const flyConfig = fs.readFileSync(flyToml, 'utf-8');
      const appMatch = flyConfig.match(/app\s*=\s*['"](.+)['"]/);
      
      if (!appMatch) {
        throw new Error('Could not find app name in fly.toml');
      }
      
      const appName = appMatch[1];
      log(`  App name: ${appName}`, colors.yellow);
      
      try {
        execSync(`flyctl status -a ${appName}`, { stdio: 'pipe' });
        log(`  App '${appName}' exists on Fly.io`, colors.green);
      } catch {
        throw new Error(`App '${appName}' not found on Fly.io. Create it with: flyctl launch`);
      }
    },
  },
];

// Run all checks
log('\n🚀 Running pre-deployment checks...', colors.blue);
log('═'.repeat(50), colors.blue);

let allPassed = true;
for (const check of checks) {
  if (!checkStep(check.name, check.fn)) {
    allPassed = false;
    break; // Stop on first failure
  }
}

log('\n' + '═'.repeat(50), colors.blue);

if (allPassed) {
  log('\n✨ All checks passed! Ready to deploy. ✨\n', colors.green);
  process.exit(0);
} else {
  log('\n❌ Deployment checks failed. Please fix the issues above.\n', colors.red);
  process.exit(1);
}

