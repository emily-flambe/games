/**
 * Baseline Manager
 * 
 * Utilities for managing baseline screenshots - creating, updating, and organizing them.
 * Supports different baseline sets for different environments/browsers.
 */

const fs = require('fs').promises;
const path = require('path');

class BaselineManager {
    constructor(baselineDir, options = {}) {
        this.baselineDir = baselineDir;
        this.options = {
            environment: options.environment || 'default',
            browser: options.browser || 'chrome',
            viewport: options.viewport || '1280x720',
            ...options
        };
        
        // Create environment-specific baseline directory
        this.envBaselineDir = path.join(
            this.baselineDir,
            `${this.options.environment}_${this.options.browser}_${this.options.viewport}`
        );
    }

    /**
     * Get the baseline path for a test
     */
    getBaselinePath(testName) {
        return path.join(this.envBaselineDir, `${testName}.png`);
    }

    /**
     * Check if baseline exists for a test
     */
    async hasBaseline(testName) {
        try {
            await fs.access(this.getBaselinePath(testName));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create baseline from screenshot
     */
    async createBaseline(testName, screenshotPath) {
        await fs.mkdir(this.envBaselineDir, { recursive: true });
        const baselinePath = this.getBaselinePath(testName);
        await fs.copyFile(screenshotPath, baselinePath);
        
        console.log(`📸 Baseline created: ${testName} → ${baselinePath}`);
        return baselinePath;
    }

    /**
     * Update existing baseline
     */
    async updateBaseline(testName, screenshotPath) {
        const baselinePath = this.getBaselinePath(testName);
        await fs.copyFile(screenshotPath, baselinePath);
        
        console.log(`🔄 Baseline updated: ${testName} → ${baselinePath}`);
        return baselinePath;
    }

    /**
     * List all baselines for current environment
     */
    async listBaselines() {
        try {
            const files = await fs.readdir(this.envBaselineDir);
            return files
                .filter(file => file.endsWith('.png'))
                .map(file => file.replace('.png', ''));
        } catch {
            return [];
        }
    }

    /**
     * Get baseline metadata
     */
    async getBaselineInfo(testName) {
        const baselinePath = this.getBaselinePath(testName);
        
        try {
            const stats = await fs.stat(baselinePath);
            return {
                testName,
                path: baselinePath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                environment: this.options.environment,
                browser: this.options.browser,
                viewport: this.options.viewport
            };
        } catch {
            return null;
        }
    }

    /**
     * Delete baseline for a test
     */
    async deleteBaseline(testName) {
        const baselinePath = this.getBaselinePath(testName);
        
        try {
            await fs.unlink(baselinePath);
            console.log(`🗑️  Baseline deleted: ${testName}`);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete all baselines for current environment
     */
    async deleteAllBaselines() {
        try {
            const files = await fs.readdir(this.envBaselineDir);
            const pngFiles = files.filter(file => file.endsWith('.png'));
            
            for (const file of pngFiles) {
                await fs.unlink(path.join(this.envBaselineDir, file));
            }
            
            console.log(`🗑️  Deleted ${pngFiles.length} baselines from ${this.envBaselineDir}`);
            return pngFiles.length;
        } catch {
            return 0;
        }
    }

    /**
     * Export baselines to a different environment
     */
    async exportTo(targetEnvironment, targetBrowser = null, targetViewport = null) {
        const targetOptions = {
            environment: targetEnvironment,
            browser: targetBrowser || this.options.browser,
            viewport: targetViewport || this.options.viewport
        };
        
        const targetManager = new BaselineManager(this.baselineDir, targetOptions);
        const baselines = await this.listBaselines();
        
        let exported = 0;
        for (const testName of baselines) {
            const sourcePath = this.getBaselinePath(testName);
            const targetPath = targetManager.getBaselinePath(testName);
            
            await fs.mkdir(targetManager.envBaselineDir, { recursive: true });
            await fs.copyFile(sourcePath, targetPath);
            exported++;
        }
        
        console.log(`📤 Exported ${exported} baselines to ${targetManager.envBaselineDir}`);
        return exported;
    }

    /**
     * Generate baseline report
     */
    async generateReport() {
        const baselines = await this.listBaselines();
        const report = {
            environment: this.options.environment,
            browser: this.options.browser,
            viewport: this.options.viewport,
            totalBaselines: baselines.length,
            baselines: []
        };
        
        for (const testName of baselines) {
            const info = await this.getBaselineInfo(testName);
            if (info) {
                report.baselines.push(info);
            }
        }
        
        return report;
    }

    /**
     * Validate baselines - check for corrupted or missing files
     */
    async validateBaselines() {
        const baselines = await this.listBaselines();
        const results = {
            valid: [],
            invalid: [],
            missing: []
        };
        
        for (const testName of baselines) {
            const baselinePath = this.getBaselinePath(testName);
            
            try {
                const stats = await fs.stat(baselinePath);
                
                // Check if file is too small (likely corrupted)
                if (stats.size < 1000) { // Less than 1KB
                    results.invalid.push({
                        testName,
                        reason: 'File too small (likely corrupted)',
                        size: stats.size
                    });
                } else {
                    results.valid.push(testName);
                }
            } catch {
                results.missing.push(testName);
            }
        }
        
        return results;
    }
}

module.exports = BaselineManager;