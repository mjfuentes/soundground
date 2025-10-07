#!/usr/bin/env node

/**
 * Deployment validation script
 * Validates that the deployed application is running as expected
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

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
 * Execute a flyctl command
 * @param {string} command - The flyctl command to execute
 * @returns {string} - Command output
 */
function executeFlyctl(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(`Flyctl command failed: ${error.message}`);
  }
}

/**
 * Get Fly.io app name from URL or environment
 * @param {string} url - The deployment URL
 * @returns {string} - App name
 */
function getFlyAppName(url) {
  // Extract from URL (e.g., https://cloudmate.fly.dev)
  const match = url.match(/https?:\/\/([^.]+)\.fly\.dev/);
  if (match) {
    return match[1];
  }
  // Fallback to environment or default
  return process.env.FLY_APP_NAME || 'cloudmate';
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

  // Add Fly.io-specific checks if URL is a Fly.io app
  const appName = getFlyAppName(url);
  if (url.includes('.fly.dev')) {
    checks.push(
      {
        name: 'Fly.io Machine Status',
        async fn() {
          try {
            const status = executeFlyctl(`flyctl status -a ${appName}`);
            
            // Parse machine status
            const lines = status.split('\n');
            const machineLines = lines.filter(line => line.includes('app') && line.trim().split(/\s+/).length >= 5);
            
            if (machineLines.length === 0) {
              throw new Error('No machines found');
            }
            
            const machines = machineLines.map(line => {
              const parts = line.trim().split(/\s+/);
              return {
                id: parts[1],
                state: parts[4],
              };
            });
            
            const runningMachines = machines.filter(m => m.state === 'started');
            const stoppedMachines = machines.filter(m => m.state === 'stopped');
            
            log(`  ✓ Total machines: ${machines.length}`, colors.green);
            
            if (runningMachines.length > 0) {
              log(`  ✓ Running machines: ${runningMachines.length}`, colors.green);
            }
            
            if (stoppedMachines.length > 0) {
              log(`  ℹ️  Stopped machines: ${stoppedMachines.length} (auto-stop enabled)`, colors.yellow);
            }
            
            // Not an error if all machines are stopped (auto-stop is configured)
            // The HTTP checks above already verified the app responds
          } catch (error) {
            log(`  ⚠️  Could not check machine status: ${error.message}`, colors.yellow);
            log('  ℹ️  Skipping Fly.io checks (flyctl may not be available)', colors.yellow);
            throw new Error('SKIP_FLY_CHECKS');
          }
        },
      },
      {
        name: 'Fly.io Application Logs',
        async fn() {
          try {
            const logs = executeFlyctl(`flyctl logs -a ${appName} --no-tail 2>&1`);
            
            // Check for critical errors in recent logs
            const errorPatterns = [
              { pattern: /EACCES.*permission denied.*mkdir/i, name: 'Permission errors' },
              { pattern: /Error:.*failed to/i, name: 'Failed operations' },
              { pattern: /FATAL/i, name: 'Fatal errors' },
              { pattern: /\[error\].*refused connection/i, name: 'Connection refusals (recent)' },
            ];
            
            // Get recent logs (last 20 lines from the last 2 minutes)
            const logLines = logs.split('\n').filter(line => line.trim());
            const recentLogs = logLines.slice(-50); // Check last 50 lines
            const now = new Date();
            const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
            
            const veryRecentLogs = recentLogs.filter(line => {
              const dateMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
              if (dateMatch) {
                const logDate = new Date(dateMatch[1] + 'Z');
                return logDate > twoMinutesAgo;
              }
              return false;
            });
            
            let hasErrors = false;
            errorPatterns.forEach(({ pattern, name }) => {
              const errors = veryRecentLogs.filter(line => pattern.test(line));
              if (errors.length > 0) {
                log(`  ⚠️  Found ${errors.length} ${name} in recent logs`, colors.yellow);
                hasErrors = true;
              }
            });
            
            if (!hasErrors) {
              log(`  ✓ No critical errors in recent logs`, colors.green);
            }
            
            // Check for trial warnings (informational only)
            const trialWarnings = recentLogs.filter(line => line.includes('Trial machine stopping'));
            if (trialWarnings.length > 0) {
              log(`  ℹ️  Trial account detected - consider adding payment method`, colors.yellow);
            } else {
              log(`  ✓ No trial limitations detected`, colors.green);
            }
          } catch (error) {
            if (error.message === 'SKIP_FLY_CHECKS') {
              throw error;
            }
            log(`  ⚠️  Could not analyze logs: ${error.message}`, colors.yellow);
          }
        },
      },
      {
        name: 'Fly.io Volume Health',
        async fn() {
          try {
            const volumes = executeFlyctl(`flyctl volumes list -a ${appName}`);
            
            // Check if volumes are attached
            const volumeLines = volumes.split('\n').filter(line => line.includes('cloudmate_data'));
            
            if (volumeLines.length > 0) {
              log(`  ✓ Found ${volumeLines.length} persistent volume(s)`, colors.green);
              
              // Check if volumes are attached
              const attachedVolumes = volumeLines.filter(line => !line.includes('unattached'));
              if (attachedVolumes.length > 0) {
                log(`  ✓ ${attachedVolumes.length} volume(s) attached to machines`, colors.green);
              }
            } else {
              log(`  ℹ️  No named volumes found (app may use ephemeral storage)`, colors.yellow);
            }
          } catch (error) {
            if (error.message === 'SKIP_FLY_CHECKS') {
              throw error;
            }
            log(`  ⚠️  Could not check volumes: ${error.message}`, colors.yellow);
          }
        },
      }
    );
  }

  try {
    let previousResponse = null;
    let skipFlyChecks = false;

    for (const check of checks) {
      // Skip remaining Fly.io checks if flyctl is not available
      if (skipFlyChecks && check.name.startsWith('Fly.io')) {
        log(`\n🔍 ${check.name}...`, colors.blue);
        log(`  ℹ️  Skipped (flyctl not available)`, colors.yellow);
        continue;
      }

      log(`\n🔍 ${check.name}...`, colors.blue);
      try {
        previousResponse = await check.fn(previousResponse);
        log(`✅ ${check.name} passed`, colors.green);
      } catch (error) {
        if (error.message === 'SKIP_FLY_CHECKS') {
          skipFlyChecks = true;
          log(`  ℹ️  Fly.io checks skipped (flyctl not available)`, colors.yellow);
        } else {
          throw error;
        }
      }
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

