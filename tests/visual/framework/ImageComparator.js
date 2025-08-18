/**
 * Image Comparator
 * 
 * Advanced image comparison utilities with multiple comparison strategies
 * and detailed diff reporting.
 */

const fs = require('fs').promises;
const path = require('path');

class ImageComparator {
    constructor(options = {}) {
        this.options = {
            // Comparison thresholds
            threshold: options.threshold || 0.1, // 0.1% difference threshold
            pixelThreshold: options.pixelThreshold || 0.1, // Per-pixel sensitivity
            
            // Anti-aliasing handling
            antialiasing: options.antialiasing !== false,
            
            // Color comparison options
            includeAA: options.includeAA !== false,
            alpha: options.alpha || 0.1,
            
            // Output options
            diffColor: options.diffColor || [255, 0, 0], // Red for differences
            
            ...options
        };
    }

    /**
     * Compare two images and return detailed results
     */
    async compare(baselinePath, screenshotPath, outputDiffPath = null) {
        try {
            // Try pixelmatch first (most accurate)
            if (await this.isPixelMatchAvailable()) {
                return await this.pixelMatchCompare(baselinePath, screenshotPath, outputDiffPath);
            }
            
            // Fallback to simple comparison
            console.log('⚠️  Pixelmatch not available, using simple file comparison');
            return await this.simpleCompare(baselinePath, screenshotPath);
            
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                differencePercentage: 100,
                method: 'error'
            };
        }
    }

    /**
     * Detailed pixel-by-pixel comparison using pixelmatch
     */
    async pixelMatchCompare(baselinePath, screenshotPath, outputDiffPath = null) {
        const PNG = require('pngjs').PNG;
        const pixelmatch = require('pixelmatch');
        
        const baseline = PNG.sync.read(await fs.readFile(baselinePath));
        const screenshot = PNG.sync.read(await fs.readFile(screenshotPath));
        
        // Check dimensions match
        if (baseline.width !== screenshot.width || baseline.height !== screenshot.height) {
            return {
                passed: false,
                differencePercentage: 100,
                error: `Dimension mismatch: baseline(${baseline.width}x${baseline.height}) vs screenshot(${screenshot.width}x${screenshot.height})`,
                method: 'pixelmatch'
            };
        }
        
        const { width, height } = baseline;
        const diff = new PNG({ width, height });
        
        const numDiffPixels = pixelmatch(
            baseline.data,
            screenshot.data,
            diff.data,
            width,
            height,
            {
                threshold: this.options.pixelThreshold,
                alpha: this.options.alpha,
                antialiasing: this.options.antialiasing,
                diffColor: this.options.diffColor,
                aaColor: [255, 255, 0], // Yellow for anti-aliasing differences
                diffColorAlt: [0, 255, 255] // Cyan for alternative differences
            }
        );
        
        const totalPixels = width * height;
        const differencePercentage = (numDiffPixels / totalPixels) * 100;
        const passed = differencePercentage <= this.options.threshold;
        
        let diffPath = null;
        if (!passed && outputDiffPath) {
            // Save diff image
            await fs.writeFile(outputDiffPath, PNG.sync.write(diff));
            diffPath = outputDiffPath;
        }
        
        return {
            passed,
            differencePercentage,
            numDiffPixels,
            totalPixels,
            dimensions: { width, height },
            diffPath,
            threshold: this.options.threshold,
            pixelThreshold: this.options.pixelThreshold,
            method: 'pixelmatch'
        };
    }

    /**
     * Simple file-based comparison (fallback)
     */
    async simpleCompare(baselinePath, screenshotPath) {
        const baselineStats = await fs.stat(baselinePath);
        const screenshotStats = await fs.stat(screenshotPath);
        
        // Quick size check
        if (baselineStats.size !== screenshotStats.size) {
            return {
                passed: false,
                differencePercentage: 100,
                method: 'simple_file',
                reason: 'File sizes differ'
            };
        }
        
        // Byte comparison
        const baselineContent = await fs.readFile(baselinePath);
        const screenshotContent = await fs.readFile(screenshotPath);
        
        if (baselineContent.equals(screenshotContent)) {
            return {
                passed: true,
                differencePercentage: 0,
                method: 'simple_file',
                reason: 'Files are identical'
            };
        }
        
        return {
            passed: false,
            differencePercentage: 100, // Unknown exact difference
            method: 'simple_file',
            reason: 'Files differ'
        };
    }

    /**
     * Compare with flexible thresholds based on test type
     */
    async compareWithContext(baselinePath, screenshotPath, context = {}) {
        const testType = context.testType || 'default';
        const dynamicOptions = this.getDynamicThresholds(testType, context);
        
        // Temporarily override options
        const originalOptions = { ...this.options };
        Object.assign(this.options, dynamicOptions);
        
        try {
            const result = await this.compare(baselinePath, screenshotPath, context.diffPath);
            
            // Add context information
            result.context = context;
            result.appliedThresholds = dynamicOptions;
            
            return result;
        } finally {
            // Restore original options
            this.options = originalOptions;
        }
    }

    /**
     * Get dynamic thresholds based on test context
     */
    getDynamicThresholds(testType, context) {
        const thresholds = {
            // End game screens - more tolerant of minor differences
            'end_screen': {
                threshold: 0.5, // Allow 0.5% difference
                pixelThreshold: 0.15
            },
            
            // Loading screens - very tolerant due to animations
            'loading': {
                threshold: 2.0, // Allow 2% difference
                pixelThreshold: 0.2
            },
            
            // Button states - strict comparison
            'button': {
                threshold: 0.05, // Very strict
                pixelThreshold: 0.05
            },
            
            // Form inputs - moderate tolerance
            'form': {
                threshold: 0.2,
                pixelThreshold: 0.1
            },
            
            // Game portal - strict for layout
            'portal': {
                threshold: 0.1,
                pixelThreshold: 0.08
            },
            
            // Modal dialogs - moderate tolerance
            'modal': {
                threshold: 0.3,
                pixelThreshold: 0.12
            },
            
            // Default - balanced approach
            'default': {
                threshold: 0.1,
                pixelThreshold: 0.1
            }
        };
        
        return thresholds[testType] || thresholds.default;
    }

    /**
     * Batch compare multiple images
     */
    async batchCompare(comparisons) {
        const results = [];
        
        for (const comparison of comparisons) {
            const { baselinePath, screenshotPath, testName, context } = comparison;
            
            try {
                const result = await this.compareWithContext(
                    baselinePath, 
                    screenshotPath, 
                    { ...context, testName }
                );
                
                results.push({
                    testName,
                    ...result
                });
            } catch (error) {
                results.push({
                    testName,
                    passed: false,
                    error: error.message,
                    differencePercentage: 100
                });
            }
        }
        
        return results;
    }

    /**
     * Generate comparison report
     */
    generateReport(results) {
        const passed = results.filter(r => r.passed).length;
        const failed = results.length - passed;
        
        const report = {
            summary: {
                total: results.length,
                passed,
                failed,
                passRate: results.length > 0 ? (passed / results.length * 100).toFixed(1) : 0
            },
            results: results.map(r => ({
                testName: r.testName,
                passed: r.passed,
                differencePercentage: r.differencePercentage?.toFixed(3),
                method: r.method,
                error: r.error,
                diffPath: r.diffPath
            })),
            failed_tests: results
                .filter(r => !r.passed)
                .map(r => ({
                    testName: r.testName,
                    differencePercentage: r.differencePercentage?.toFixed(3),
                    error: r.error,
                    diffPath: r.diffPath
                }))
        };
        
        return report;
    }

    /**
     * Check if pixelmatch is available
     */
    async isPixelMatchAvailable() {
        try {
            require('pixelmatch');
            require('pngjs');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get system capabilities
     */
    async getCapabilities() {
        return {
            pixelmatch: await this.isPixelMatchAvailable(),
            supportedFormats: ['png'], // Currently only PNG
            features: [
                'pixel_comparison',
                'anti_aliasing_detection',
                'flexible_thresholds',
                'batch_processing',
                'diff_generation'
            ]
        };
    }
}

module.exports = ImageComparator;