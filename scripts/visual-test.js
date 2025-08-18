#!/usr/bin/env node

/**
 * Visual Test CLI Tool
 * 
 * Simple command-line interface for managing visual regression tests.
 * Makes it easy to run tests, update baselines, and manage test artifacts.
 */

const VisualTestRunner = require('../tests/visual/framework/VisualTestRunner');
const path = require('path');
const fs = require('fs');

const COMMANDS = {
    run: 'Run visual regression tests',
    update: 'Update baselines for all tests',
    clean: 'Clean up test artifacts',
    validate: 'Validate test environment',
    report: 'Show latest test report',
    help: 'Show this help message'
};

async function runVisualTests(options = {}) {
    const runner = new VisualTestRunner({
        headless: options.headless !== false,
        updateBaselines: options.updateBaselines || false,
        threshold: options.threshold || 0.1,
        environment: options.environment || 'cli'
    });

    try {
        await runner.initialize();
        
        // Run County Game tests
        console.log('🎮 Running County Game visual tests...');
        const countyReport = await runner.runTestSuite(
            path.join(__dirname, '../tests/visual/county-game.visual.js')
        );
        
        // Run other games tests
        console.log('🎮 Running other games visual tests...');
        const otherReport = await runner.runTestSuite(
            path.join(__dirname, '../tests/visual/other-games.visual.js')
        );
        
        // Combined results
        const totalPassed = countyReport.summary.passed + otherReport.summary.passed;
        const totalFailed = countyReport.summary.failed + otherReport.summary.failed;
        const totalTests = countyReport.summary.total + otherReport.summary.total;
        
        console.log('\n🏁 Visual Test Results Summary');
        console.log('══════════════════════════════');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${totalPassed} ✅`);
        console.log(`Failed: ${totalFailed} ❌`);
        console.log(`Pass Rate: ${totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0}%`);
        
        if (totalFailed > 0) {
            console.log('\n❌ Failed Tests:');
            [...countyReport.failed_tests, ...otherReport.failed_tests].forEach(test => {
                console.log(`  • ${test.name}: ${test.error || `${test.differencePercentage?.toFixed(3)}% difference`}`);
            });
            
            process.exit(1);
        } else {
            console.log('\n🎉 All visual tests passed!');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ Visual test execution failed:', error.message);
        process.exit(1);
    } finally {
        await runner.cleanup();
    }
}

async function updateBaselines(options = {}) {
    console.log('🔄 Updating all visual test baselines...');
    
    const runner = new VisualTestRunner({
        headless: options.headless !== false,
        updateBaselines: true,
        environment: options.environment || 'cli'
    });

    try {
        await runner.initialize();
        await runner.updateAllBaselines();
        console.log('✅ All baselines updated successfully');
    } catch (error) {
        console.error('❌ Baseline update failed:', error.message);
        process.exit(1);
    } finally {
        await runner.cleanup();
    }
}

async function cleanArtifacts(options = {}) {
    console.log('🧹 Cleaning visual test artifacts...');
    
    const runner = new VisualTestRunner({
        environment: options.environment || 'cli'
    });

    await runner.cleanupArtifacts({
        screenshots: true,
        diffs: !options.keepDiffs,
        reports: options.cleanReports || false,
        baselines: options.cleanBaselines || false
    });
    
    console.log('✅ Artifacts cleaned up');
}

async function validateEnvironment() {
    console.log('🔍 Validating visual test environment...');
    
    const runner = new VisualTestRunner();
    
    try {
        await runner.initialize();
        const validation = await runner.validateEnvironment();
        
        if (validation.framework && validation.baselines && validation.dependencies) {
            console.log('✅ Environment validation passed');
        } else {
            console.log('❌ Environment validation failed');
            validation.errors.forEach(error => console.log(`  • ${error}`));
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Environment validation error:', error.message);
        process.exit(1);
    } finally {
        await runner.cleanup();
    }
}

async function showReport() {
    const reportPath = path.join(__dirname, '../tests/visual/reports/latest.json');
    
    try {
        const reportData = fs.readFileSync(reportPath, 'utf8');
        const report = JSON.parse(reportData);
        
        console.log('📊 Latest Visual Test Report');
        console.log('════════════════════════════');
        console.log(`Total Tests: ${report.summary.total}`);
        console.log(`Passed: ${report.summary.passed} ✅`);
        console.log(`Failed: ${report.summary.failed} ❌`);
        console.log(`Pass Rate: ${report.summary.passRate}%`);
        console.log(`Duration: ${report.summary.duration}`);
        console.log(`Environment: ${report.environment.environment} (${report.environment.browser})`);
        
        if (report.failed_tests.length > 0) {
            console.log('\n❌ Failed Tests:');
            report.failed_tests.forEach(test => {
                console.log(`  • ${test.testName}: ${test.error || `${test.differencePercentage}% difference`}`);
            });
        }
        
    } catch (error) {
        console.log('ℹ️  No report available. Run visual tests first.');
    }
}

function showHelp() {
    console.log('Visual Test CLI Tool');
    console.log('===================');
    console.log('');
    console.log('Usage: node scripts/visual-test.js <command> [options]');
    console.log('');
    console.log('Commands:');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(10)} ${desc}`);
    });
    console.log('');
    console.log('Options:');
    console.log('  --headless          Run in headless mode (default: true)');
    console.log('  --no-headless       Run with visible browser');
    console.log('  --threshold <n>     Set difference threshold (default: 0.1)');
    console.log('  --environment <env> Set test environment (default: cli)');
    console.log('  --keep-diffs        Keep diff images when cleaning');
    console.log('  --clean-reports     Clean report files');
    console.log('  --clean-baselines   Clean baseline images (dangerous!)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/visual-test.js run');
    console.log('  node scripts/visual-test.js run --no-headless');
    console.log('  node scripts/visual-test.js update');
    console.log('  node scripts/visual-test.js clean --keep-diffs');
    console.log('  node scripts/visual-test.js validate');
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {};
    
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--headless') {
            options.headless = true;
        } else if (arg === '--no-headless') {
            options.headless = false;
        } else if (arg === '--threshold') {
            options.threshold = parseFloat(args[++i]);
        } else if (arg === '--environment') {
            options.environment = args[++i];
        } else if (arg === '--keep-diffs') {
            options.keepDiffs = true;
        } else if (arg === '--clean-reports') {
            options.cleanReports = true;
        } else if (arg === '--clean-baselines') {
            options.cleanBaselines = true;
        }
    }
    
    return { command, options };
}

// Main execution
async function main() {
    const { command, options } = parseArgs();
    
    switch (command) {
        case 'run':
            await runVisualTests(options);
            break;
        case 'update':
            await updateBaselines(options);
            break;
        case 'clean':
            await cleanArtifacts(options);
            break;
        case 'validate':
            await validateEnvironment();
            break;
        case 'report':
            await showReport();
            break;
        case 'help':
        default:
            showHelp();
            break;
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ CLI Error:', error.message);
        process.exit(1);
    });
}

module.exports = {
    runVisualTests,
    updateBaselines,
    cleanArtifacts,
    validateEnvironment,
    showReport
};