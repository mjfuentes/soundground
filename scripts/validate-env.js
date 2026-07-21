#!/usr/bin/env node

/**
 * Environment validation script
 * Checks if all required environment variables are set
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Define required environment variables
const requiredEnvVars = [
  'SOUNDCLOUD_CLIENT_ID',
  'SOUNDCLOUD_CLIENT_SECRET',
];

const optionalEnvVars = [
  'SOUNDCLOUD_APIV2_CLIENT_ID',
  'JWT_SECRET',
  'CACHE_DB_PATH',
  'NEXT_PUBLIC_BASE_URL',
  'VERCEL_URL',
  'FLY_APP_NAME',
  'NODE_ENV',
];

log('\n🔍 Validating environment variables...', colors.yellow);
log('═'.repeat(50), colors.yellow);

let hasErrors = false;

// Check required variables
if (requiredEnvVars.length > 0) {
  log('\nRequired variables:', colors.yellow);
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`  ✅ ${envVar}`, colors.green);
    } else {
      log(`  ❌ ${envVar} (missing)`, colors.red);
      hasErrors = true;
    }
  }
} else {
  log('\n✅ No required environment variables defined', colors.green);
}

// Check optional variables (just informational)
log('\nOptional variables:', colors.yellow);
for (const envVar of optionalEnvVars) {
  if (process.env[envVar]) {
    log(`  ✅ ${envVar} = ${process.env[envVar]}`, colors.green);
  } else {
    log(`  ⚠️  ${envVar} (not set)`, colors.yellow);
  }
}

log('\n' + '═'.repeat(50), colors.yellow);

if (hasErrors) {
  log('\n❌ Missing required environment variables!\n', colors.red);
  process.exit(1);
} else {
  log('\n✨ Environment validation passed!\n', colors.green);
  process.exit(0);
}

