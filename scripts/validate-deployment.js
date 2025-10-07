#!/usr/bin/env node

/**
 * Deployment validation script
 * Validates that the deployed application is running as expected
 */

const https = require('https');
const http = require('http');

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

/**
 * Make an HTTP(S) request
 * @param {string} url - The URL to request
 * @returns {Promise<{statusCode: number, body: string, headers: object}>}
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'CloudMate-Validator/1.0',
      },
      timeout: 10000, // 10 second timeout
    };

    const req = client.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body,
          headers: res.headers,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Validate the deployment
 * @param {string} url - The URL to validate
 */
async function validateDeployment(url) {
  log('\n🔍 Validating deployment...', colors.blue);
  log('═'.repeat(50), colors.blue);
  log(`\n📍 Target URL: ${url}`, colors.yellow);

  const checks = [
    {
      name: 'HTTP Response',
      async fn() {
        log('  Making request...', colors.yellow);
        const response = await makeRequest(url);
        
        if (response.statusCode !== 200) {
          throw new Error(`Expected status 200, got ${response.statusCode}`);
        }
        
        log(`  ✓ Status code: ${response.statusCode}`, colors.green);
        return response;
      },
    },
    {
      name: 'Content Validation',
      async fn(previousResponse) {
        const { body } = previousResponse;
        
        // Check if the body contains expected content
        const checks = [
          { name: 'HTML structure', test: () => body.includes('<!DOCTYPE html>') || body.includes('<html') },
          { name: 'Title (Cloudmate)', test: () => body.toLowerCase().includes('cloudmate') },
          { name: 'Body content', test: () => body.length > 100 },
        ];

        const results = checks.map((check) => ({
          name: check.name,
          passed: check.test(),
        }));

        const allPassed = results.every((r) => r.passed);
        
        results.forEach((result) => {
          const symbol = result.passed ? '✓' : '✗';
          const color = result.passed ? colors.green : colors.red;
          log(`  ${symbol} ${result.name}`, color);
        });

        if (!allPassed) {
          throw new Error('Content validation failed');
        }
        
        return previousResponse;
      },
    },
    {
      name: 'Response Headers',
      async fn(previousResponse) {
        const { headers } = previousResponse;
        
        // Check important headers
        const headerChecks = [
          { name: 'Content-Type', key: 'content-type', expected: 'text/html' },
        ];

        headerChecks.forEach((check) => {
          const value = headers[check.key];
          if (value && value.includes(check.expected)) {
            log(`  ✓ ${check.name}: ${value}`, colors.green);
          } else {
            log(`  ⚠️  ${check.name}: ${value || 'not set'}`, colors.yellow);
          }
        });
        
        return previousResponse;
      },
    },
    {
      name: 'Response Time',
      async fn() {
        const startTime = Date.now();
        await makeRequest(url);
        const responseTime = Date.now() - startTime;
        
        log(`  ✓ Response time: ${responseTime}ms`, colors.green);
        
        if (responseTime > 5000) {
          log('  ⚠️  Response time is slow (>5s)', colors.yellow);
        }
      },
    },
  ];

  try {
    let previousResponse = null;

    for (const check of checks) {
      log(`\n🔍 ${check.name}...`, colors.blue);
      previousResponse = await check.fn(previousResponse);
      log(`✅ ${check.name} passed`, colors.green);
    }

    log('\n' + '═'.repeat(50), colors.blue);
    log('\n✨ Deployment validation passed! App is running correctly. ✨\n', colors.green);
    return true;
  } catch (error) {
    log('\n' + '═'.repeat(50), colors.blue);
    log(`\n❌ Deployment validation failed: ${error.message}\n`, colors.red);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`, colors.red);
    }
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);
const url = args[0] || process.env.DEPLOYMENT_URL || 'https://cloudmate.fly.dev/';

// Validate URL format
try {
  new URL(url);
} catch (error) {
  log(`\n❌ Invalid URL: ${url}\n`, colors.red);
  log('Usage: node validate-deployment.js [URL]', colors.yellow);
  log('   or: DEPLOYMENT_URL=https://example.com node validate-deployment.js\n', colors.yellow);
  process.exit(1);
}

validateDeployment(url)
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(`\n❌ Unexpected error: ${error.message}\n`, colors.red);
    process.exit(1);
  });

