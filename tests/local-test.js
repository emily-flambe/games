#!/usr/bin/env node
/**
 * Local testing script for Games Platform
 * Verifies basic functionality without requiring deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Starting local tests for Games Platform...\n');

// Test 1: Verify required files exist
function testRequiredFiles() {
  console.log('📁 Testing required files...');
  
  const requiredFiles = [
    'src/index.ts',
    'src/router.ts',
    'src/durable-objects/GameSession.ts',
    'src/durable-objects/SessionManager.ts',
    'src/static/index.html',
    'src/static/bundle.js',
    'wrangler.toml',
    'tsconfig.json'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - MISSING`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

// Test 2: Verify TypeScript configuration
function testTypeScriptConfig() {
  console.log('\n⚙️  Testing TypeScript configuration...');
  
  try {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    if (tsConfig.compilerOptions && tsConfig.compilerOptions.types) {
      console.log('  ✅ TypeScript config exists with types');
      return true;
    } else {
      console.log('  ❌ TypeScript config missing types configuration');
      return false;
    }
  } catch (error) {
    console.log('  ❌ TypeScript config is invalid or missing');
    return false;
  }
}

// Test 3: Verify Wrangler configuration
function testWranglerConfig() {
  console.log('\n🔧 Testing Wrangler configuration...');
  
  try {
    const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
    
    const hasGameSession = wranglerConfig.includes('GameSession');
    const hasSessionManager = wranglerConfig.includes('SessionManager');
    const hasMainFile = wranglerConfig.includes('main = "src/index.ts"');
    
    if (hasGameSession && hasSessionManager && hasMainFile) {
      console.log('  ✅ Wrangler config has required Durable Objects');
      console.log('  ✅ Wrangler config has correct main file');
      return true;
    } else {
      console.log('  ❌ Wrangler config missing required configurations');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Wrangler config is invalid or missing');
    return false;
  }
}

// Test 4: Verify static files
function testStaticFiles() {
  console.log('\n📄 Testing static files...');
  
  try {
    const htmlContent = fs.readFileSync('src/static/index.html', 'utf8');
    const hasWebSocketCode = htmlContent.includes('WebSocket') || htmlContent.includes('ws://');
    
    if (fs.existsSync('src/static/bundle.js')) {
      console.log('  ✅ Bundle file exists');
    } else {
      console.log('  ⚠️  Bundle file missing - run "npm run build" first');
    }
    
    if (hasWebSocketCode) {
      console.log('  ✅ HTML contains WebSocket code');
    } else {
      console.log('  ⚠️  HTML may be missing WebSocket integration');
    }
    
    return true;
  } catch (error) {
    console.log('  ❌ Static files test failed:', error.message);
    return false;
  }
}

// Test 5: Check package.json dependencies
function testDependencies() {
  console.log('\n📦 Testing package dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredDevDeps = ['wrangler', 'typescript', '@cloudflare/workers-types'];
    let allDepsPresent = true;
    
    for (const dep of requiredDevDeps) {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        console.log(`  ✅ ${dep}`);
      } else {
        console.log(`  ❌ ${dep} - MISSING`);
        allDepsPresent = false;
      }
    }
    
    return allDepsPresent;
  } catch (error) {
    console.log('  ❌ Package.json test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    files: testRequiredFiles(),
    typescript: testTypeScriptConfig(),
    wrangler: testWranglerConfig(),
    static: testStaticFiles(),
    dependencies: testDependencies()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passed = 0;
  let total = 0;
  
  for (const [test, result] of Object.entries(results)) {
    total++;
    if (result) {
      passed++;
      console.log(`✅ ${test}: PASSED`);
    } else {
      console.log(`❌ ${test}: FAILED`);
    }
  }
  
  console.log(`\n🎯 ${passed}/${total} tests passed\n`);
  
  if (passed === total) {
    console.log('🚀 All tests passed! Ready for development.');
    console.log('\nNext steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Start development server: npm run dev');
    console.log('3. Test WebSocket connections: npm run test:integration');
  } else {
    console.log('🔧 Some tests failed. Please check the above output and fix issues before proceeding.');
    process.exit(1);
  }
}

runAllTests().catch(console.error);