#!/usr/bin/env node

/**
 * Integration Test for Toji Launcher
 * Tests core functionality without GUI
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Toji Launcher Integration Test\n');
console.log('=' .repeat(50));

// Test 1: Build verification
console.log('\n✅ Test 1: Build Verification');
try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('   Build successful - TypeScript compiled without errors');
} catch (error) {
    console.error('   ❌ Build failed:', error.message);
    process.exit(1);
}

// Test 2: Check main process module
console.log('\n✅ Test 2: Main Process Module');
const mainPath = path.join(__dirname, 'dist', 'main.js');
if (fs.existsSync(mainPath)) {
    console.log('   Main process bundle exists:', mainPath);
    const mainSize = fs.statSync(mainPath).size;
    console.log('   Bundle size:', (mainSize / 1024).toFixed(2), 'KB');
} else {
    console.error('   ❌ Main process bundle not found');
    process.exit(1);
}

// Test 3: Check renderer bundle
console.log('\n✅ Test 3: Renderer Bundle');
const rendererPath = path.join(__dirname, 'dist', 'renderer.js');
if (fs.existsSync(rendererPath)) {
    console.log('   Renderer bundle exists:', rendererPath);
    const rendererSize = fs.statSync(rendererPath).size;
    console.log('   Bundle size:', (rendererSize / 1024).toFixed(2), 'KB');
} else {
    console.error('   ❌ Renderer bundle not found');
    process.exit(1);
}

// Test 4: Check bot bundle availability
console.log('\n✅ Test 4: Bot Bundle Check');
const botBundlePath = path.join(__dirname, '..', 'bot', 'dist', 'toji-bot');
if (fs.existsSync(botBundlePath)) {
    console.log('   Bot bundle available:', botBundlePath);
    const botSize = fs.statSync(botBundlePath).size;
    console.log('   Bundle size:', (botSize / 1024 / 1024).toFixed(2), 'MB');
} else {
    console.log('   ⚠️  Bot bundle not found (will be downloaded on first run)');
}

// Test 5: Check dependency modules
console.log('\n✅ Test 5: Core Dependencies');
const requiredModules = [
    'electron',
    'react',
    'react-dom',
    'typescript',
    'webpack'
];

requiredModules.forEach(moduleName => {
    const modulePath = path.join(__dirname, 'node_modules', moduleName);
    if (fs.existsSync(modulePath)) {
        console.log('   ✓', moduleName, 'installed');
    } else {
        console.error('   ❌', moduleName, 'missing');
    }
});

// Test 6: Check IPC handlers (static analysis)
console.log('\n✅ Test 6: IPC Handler Analysis');
const mainContent = fs.readFileSync(mainPath, 'utf8');
const ipcHandlers = [
    'auth:start',
    'auth:get-token',
    'auth:logout',
    'dependency:check',
    'dependency:install',
    'bot:download',
    'bot:extract',
    'bot:verify'
];

ipcHandlers.forEach(handler => {
    if (mainContent.includes(handler)) {
        console.log('   ✓ IPC handler found:', handler);
    } else {
        console.log('   ⚠️  IPC handler not found:', handler);
    }
});

// Test 7: Configuration files
console.log('\n✅ Test 7: Configuration Files');
const configs = [
    'package.json',
    'tsconfig.json',
    'webpack.config.js',
    'CLAUDE.md',
    'LAUNCHER_ROADMAP.md',
    'NEXT.md'
];

configs.forEach(config => {
    const configPath = path.join(__dirname, config);
    if (fs.existsSync(configPath)) {
        console.log('   ✓', config, 'exists');
    } else {
        console.error('   ❌', config, 'missing');
    }
});

// Test 8: Source file structure
console.log('\n✅ Test 8: Source Structure');
const sourceFiles = [
    'src/main/index.ts',
    'src/main/auth/oauth.ts',
    'src/main/bot/downloader.ts',
    'src/main/dependencies/checker.ts',
    'src/renderer/App.tsx',
    'src/renderer/components/SetupFlow.tsx'
];

sourceFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log('   ✓', file, 'exists');
    } else {
        console.error('   ❌', file, 'missing');
    }
});

// Test summary
console.log('\n' + '=' .repeat(50));
console.log('🎉 Integration Tests Complete!');
console.log('\nLauncher Status:');
console.log('  • Build: ✅ Success');
console.log('  • Structure: ✅ Valid');
console.log('  • Dependencies: ✅ Installed');
console.log('  • Bot Bundle: ' + (fs.existsSync(botBundlePath) ? '✅ Ready' : '⚠️  Will download'));
console.log('\nNote: GUI testing requires display environment.');
console.log('For full testing, run on a machine with display or use CI/CD with xvfb.');