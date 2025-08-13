#!/usr/bin/env node

/**
 * Version Generation Script
 * 
 * Generates a version.json file with:
 * - Semantic version from package.json
 * - Branch-based suffix (main = no suffix, others = -alpha)
 * - Deployment timestamp
 * - Git commit hash
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return { branch, commit };
  } catch (error) {
    console.warn('Warning: Could not get git info:', error.message);
    return { branch: 'unknown', commit: 'unknown' };
  }
}

function generateVersion() {
  // Read package.json version
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const baseVersion = packageJson.version;
  
  // Get git info
  const { branch, commit } = getGitInfo();
  
  // Use the base version without any suffix
  let version = baseVersion;
  
  // Create version object
  const versionInfo = {
    version,
    baseVersion,
    branch,
    commit,
    timestamp: new Date().toISOString(),
    deployedAt: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  };
  
  // Write version.json to static directory
  const versionPath = path.join(__dirname, '..', 'src', 'static', 'version.json');
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
  
  console.log(`✅ Generated version: ${version} (${branch}@${commit})`);
  console.log(`📦 Version file: ${versionPath}`);
  
  return versionInfo;
}

if (require.main === module) {
  generateVersion();
}

module.exports = { generateVersion };