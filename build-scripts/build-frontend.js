#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple TypeScript-like compiler that handles basic ES6+ to ES5 conversion
class SimpleCompiler {
    constructor() {
        this.modules = new Map();
        this.processed = new Set();
    }

    // Read and parse a TypeScript file
    readFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        return fs.readFileSync(filePath, 'utf8');
    }

    // Convert TypeScript-like syntax to JavaScript
    transformTypeScript(code) {
        // Remove type annotations
        code = code.replace(/:\s*[A-Za-z_][A-Za-z0-9_<>\[\]|&\s]*(?=\s*[;,=)])/g, '');
        code = code.replace(/:\s*[A-Za-z_][A-Za-z0-9_<>\[\]|&\s]*(?=\s*=>)/g, '');
        
        // Remove interface definitions
        code = code.replace(/interface\s+\w+\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
        
        // Remove type imports
        code = code.replace(/import\s+type\s+.*?from\s+['"][^'"]*['"];?\s*/g, '');
        
        // Convert class property declarations
        code = code.replace(/private\s+/g, '');
        code = code.replace(/public\s+/g, '');
        code = code.replace(/protected\s+/g, '');
        code = code.replace(/readonly\s+/g, '');
        
        // Handle generic types
        code = code.replace(/<[^<>]*>/g, '');
        
        // Convert arrow functions with type parameters
        code = code.replace(/=>\s*\{/g, '=> {');
        
        return code;
    }

    // Extract imports from a file
    extractImports(code) {
        const imports = [];
        const importRegex = /import\s+(?:\*\s+as\s+\w+|{[^}]*}|\w+)\s+from\s+['"]([^'"]+)['"];?/g;
        let match;

        while ((match = importRegex.exec(code)) !== null) {
            imports.push({
                fullMatch: match[0],
                path: match[1]
            });
        }

        return imports;
    }

    // Remove import statements
    removeImports(code) {
        return code.replace(/import\s+(?:\*\s+as\s+\w+|{[^}]*}|\w+)\s+from\s+['"][^'"]*['"];?\s*/g, '');
    }

    // Process a file and its dependencies
    processFile(filePath, basePath = '') {
        const fullPath = path.resolve(basePath, filePath);
        
        if (this.processed.has(fullPath)) {
            return '';
        }
        
        this.processed.add(fullPath);
        
        console.log(`Processing: ${fullPath}`);
        
        let code = this.readFile(fullPath);
        const imports = this.extractImports(code);
        
        // Process dependencies first
        let dependencyCode = '';
        for (const imp of imports) {
            let depPath = imp.path;
            
            // Handle relative imports
            if (depPath.startsWith('./') || depPath.startsWith('../')) {
                depPath = path.resolve(path.dirname(fullPath), depPath);
                if (!depPath.endsWith('.ts')) {
                    depPath += '.ts';
                }
                dependencyCode += this.processFile(depPath);
            }
        }
        
        // Remove imports and transform TypeScript
        code = this.removeImports(code);
        code = this.transformTypeScript(code);
        
        // Remove export statements but keep the declarations
        code = code.replace(/export\s+(class|function|const|let|var)/g, '$1');
        code = code.replace(/export\s*\{[^}]*\};?\s*/g, '');
        code = code.replace(/export\s+default\s+/g, '');
        
        return dependencyCode + '\n' + code + '\n';
    }

    // Build the final bundle
    build(entryPoint, outputPath) {
        console.log('Building frontend bundle...');
        console.log(`Entry point: ${entryPoint}`);
        console.log(`Output: ${outputPath}`);
        
        try {
            this.modules.clear();
            this.processed.clear();
            
            const bundleCode = this.processFile(entryPoint);
            
            // Wrap in IIFE to avoid global scope pollution
            const finalCode = `
(function() {
    'use strict';
    
${bundleCode}
})();
`;
            
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, finalCode);
            
            const stats = fs.statSync(outputPath);
            console.log(`✓ Bundle created successfully!`);
            console.log(`  Size: ${Math.round(stats.size / 1024 * 100) / 100} KB`);
            console.log(`  Files processed: ${this.processed.size}`);
            
        } catch (error) {
            console.error('Build failed:', error.message);
            process.exit(1);
        }
    }
}

// Main build function
function buildFrontend() {
    const compiler = new SimpleCompiler();
    
    // Configuration
    const config = {
        entryPoint: path.join(__dirname, '../frontend-src/main.ts'),
        outputPath: path.join(__dirname, '../src/static/bundle.js'),
        sourceDir: path.join(__dirname, '../frontend-src'),
        outputDir: path.join(__dirname, '../src/static')
    };
    
    // Verify source directory exists
    if (!fs.existsSync(config.sourceDir)) {
        console.error(`Source directory not found: ${config.sourceDir}`);
        process.exit(1);
    }
    
    // Verify entry point exists
    if (!fs.existsSync(config.entryPoint)) {
        console.error(`Entry point not found: ${config.entryPoint}`);
        process.exit(1);
    }
    
    // Build the bundle
    compiler.build(config.entryPoint, config.outputPath);
    
    console.log('\n✓ Frontend build complete!');
    console.log('\nBundle contents:');
    console.log(`  - WebSocket connection management`);
    console.log(`  - Game portal interface`);
    console.log(`  - Game room functionality`);
    console.log(`  - Multiple game board renderers`);
    console.log('\nTo test: Open index.html in a browser or serve via HTTP server');
}

// Watch mode for development
function watchMode() {
    console.log('Starting watch mode...');
    
    const sourceDir = path.join(__dirname, '../frontend-src');
    let timeout;
    
    fs.watch(sourceDir, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.ts')) {
            console.log(`\n📁 File changed: ${filename}`);
            
            // Debounce rebuilds
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                buildFrontend();
                console.log('\n👀 Watching for changes...');
            }, 500);
        }
    });
    
    // Initial build
    buildFrontend();
    console.log('\n👀 Watching for changes... (Press Ctrl+C to stop)');
}

// CLI handling
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--watch') || args.includes('-w')) {
        watchMode();
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Frontend Build Script

Usage:
  node build-frontend.js          Build once
  node build-frontend.js --watch  Build and watch for changes
  node build-frontend.js --help   Show this help

Features:
  - TypeScript-like syntax support
  - Import/export resolution
  - Single file bundle output
  - Development watch mode
  - No external dependencies
        `);
    } else {
        buildFrontend();
    }
}

module.exports = { buildFrontend, SimpleCompiler };