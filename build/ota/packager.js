#!/usr/bin/env node

/**
 * Titanium OTA - Bundle Packager
 *
 * Creates OTA bundles from source code:
 * 1. Transpile TypeScript to CommonJS (if applicable)
 * 2. Run micro-bundler to create single app.bundle.js
 * 3. Zip bundle with assets
 * 4. Calculate SHA-256 hash
 * 5. Sign with Ed25519
 * 6. Generate manifest.json
 * 7. Upload to CDN (optional)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
	sourceDir: './src',
	buildDir: './build/ota',
	outputDir: './dist/ota',
	bundleName: 'app.bundle.js',

	// Transpilation
	typescript: true,
	tscCommand: 'npx tsc',

	// Bundling
	bundlerEntry: './build/app.js',
	bundlerOutput: './build/app.bundle.js',

	// Assets
	assetsDir: './assets',
	includeAssets: true,

	// Versioning
	version: '1.0.0',
	buildNumber: null,

	// Signing
	privateKeyHex: null,
	privateKeyFile: null,
	keyId: 'main',

	// Manifest
	manifestUrl: null,
	bundleUrl: null,
	channel: 'production',
	rolloutPercentage: 100,

	// Upload
	upload: false,
	uploadCommand: null,
	cdnBaseUrl: null
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Package OTA bundle
 */
async function packageBundle(userConfig = {}) {
	const config = { ...DEFAULT_CONFIG, ...userConfig };

	console.log('==============================================');
	console.log('Titanium OTA - Bundle Packager');
	console.log('==============================================');
	console.log('Version:', config.version);
	console.log('Channel:', config.channel);
	console.log('');

	try {
		// Step 1: Clean build directory
		console.log('[1/9] Cleaning build directory...');
		cleanDirectory(config.buildDir);

		// Step 2: Transpile TypeScript (if enabled)
		if (config.typescript) {
			console.log('[2/9] Transpiling TypeScript...');
			transpileTypeScript(config);
		} else {
			console.log('[2/9] Skipping TypeScript transpilation');
		}

		// Step 3: Run micro-bundler
		console.log('[3/9] Running micro-bundler...');
		const bundleContent = await runMicroBundler(config);

		// Step 4: Copy assets
		if (config.includeAssets) {
			console.log('[4/9] Copying assets...');
			copyAssets(config);
		} else {
			console.log('[4/9] Skipping assets');
		}

		// Step 5: Calculate SHA-256 hash
		console.log('[5/9] Calculating SHA-256 hash...');
		const hash = calculateHash(bundleContent);
		console.log('Hash:', hash);

		// Step 6: Sign with Ed25519
		console.log('[6/9] Signing bundle...');
		const signature = signBundle(hash, config);
		console.log('Signature:', signature.substring(0, 32) + '...');

		// Step 7: Generate manifest
		console.log('[7/9] Generating manifest...');
		const manifest = generateManifest(config, bundleContent, hash, signature);

		// Step 8: Create output package
		console.log('[8/9] Creating package...');
		const packagePath = createPackage(config, bundleContent, manifest);
		console.log('Package created:', packagePath);

		// Step 9: Upload (if enabled)
		if (config.upload) {
			console.log('[9/9] Uploading to CDN...');
			uploadPackage(config, packagePath);
		} else {
			console.log('[9/9] Skipping upload');
		}

		console.log('');
		console.log('✓ Bundle packaged successfully!');
		console.log('');
		console.log('Output:', packagePath);
		console.log('Version:', config.version);
		console.log('Hash:', hash);
		console.log('');

		return {
			success: true,
			packagePath,
			manifest,
			hash,
			signature
		};

	} catch (error) {
		console.error('');
		console.error('✗ Packaging failed:', error.message);
		console.error('');

		if (error.stack) {
			console.error(error.stack);
		}

		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Clean directory
 */
function cleanDirectory(dir) {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	fs.mkdirSync(dir, { recursive: true });
}

/**
 * Transpile TypeScript
 */
function transpileTypeScript(config) {
	try {
		console.log('Running:', config.tscCommand);
		execSync(config.tscCommand, { stdio: 'inherit' });
	} catch (error) {
		throw new Error('TypeScript transpilation failed: ' + error.message);
	}
}

/**
 * Run micro-bundler
 *
 * Creates a single app.bundle.js from CommonJS modules
 */
async function runMicroBundler(config) {
	console.log('Entry:', config.bundlerEntry);
	console.log('Output:', config.bundlerOutput);

	// For POC, use simple concatenation
	// In production, implement proper module resolution and bundling

	const entryPath = path.resolve(config.bundlerEntry);

	if (!fs.existsSync(entryPath)) {
		throw new Error('Entry file not found: ' + entryPath);
	}

	// Simple bundler: Read entry file
	// Production would resolve all require() calls and bundle them
	const entryContent = fs.readFileSync(entryPath, 'utf8');

	// Wrap in minimal module loader
	const bundleContent = createMinimalBundle(entryContent);

	// Write to output
	fs.writeFileSync(config.bundlerOutput, bundleContent, 'utf8');

	console.log('Bundle size:', (bundleContent.length / 1024).toFixed(2), 'KB');

	return bundleContent;
}

/**
 * Create minimal bundle wrapper
 */
function createMinimalBundle(code) {
	return `
// Titanium OTA Bundle
// Auto-generated - do not edit

(function(global) {
	'use strict';
	
	// Minimal require system
	const modules = {};
	const cache = {};
	
	function require(id) {
		if (cache[id]) return cache[id].exports;
		if (!modules[id]) throw new Error('Module not found: ' + id);
		
		const module = { exports: {}, id: id };
		cache[id] = module;
		
		modules[id].call(module.exports, module, module.exports, require);
		
		return module.exports;
	}
	
	// App code
	${code}
	
})(this);
`.trim();
}

/**
 * Copy assets
 */
function copyAssets(config) {
	const sourceDir = path.resolve(config.assetsDir);
	const targetDir = path.join(config.buildDir, 'assets');

	if (!fs.existsSync(sourceDir)) {
		console.log('No assets directory found, skipping');
		return;
	}

	// Copy recursively
	copyRecursive(sourceDir, targetDir);

	console.log('Assets copied to:', targetDir);
}

/**
 * Copy directory recursively
 */
function copyRecursive(src, dest) {
	if (!fs.existsSync(src)) {
		return;
	}

	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyRecursive(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * Calculate SHA-256 hash
 */
function calculateHash(content) {
	return crypto
		.createHash('sha256')
		.update(content, 'utf8')
		.digest('hex');
}

/**
 * Sign bundle with Ed25519
 */
function signBundle(hash, config) {
	// Load private key
	let privateKeyHex = config.privateKeyHex;

	if (!privateKeyHex && config.privateKeyFile) {
		privateKeyHex = fs.readFileSync(config.privateKeyFile, 'utf8').trim();
	}

	if (!privateKeyHex) {
		console.warn('⚠️  No private key provided, using placeholder signature');
		console.warn('⚠️  Set privateKeyHex or privateKeyFile in config');
		return '0'.repeat(128); // Placeholder
	}

	// Use tweetnacl for Ed25519 signing
	try {
		const nacl = require('tweetnacl');

		const privateKey = Buffer.from(privateKeyHex, 'hex');
		const message = Buffer.from(hash, 'hex');

		const signature = nacl.sign.detached(message, privateKey);

		return Buffer.from(signature).toString('hex');

	} catch (error) {
		console.warn('⚠️  Ed25519 signing failed:', error.message);
		console.warn('⚠️  Install tweetnacl: npm install tweetnacl');
		console.warn('⚠️  Using placeholder signature');
		return '0'.repeat(128); // Placeholder
	}
}

/**
 * Generate manifest
 */
function generateManifest(config, bundleContent, hash, signature) {
	const timestamp = Math.floor(Date.now() / 1000);
	const buildNumber = config.buildNumber || timestamp;

	const manifest = {
		schemaVersion: '1.0.0',
		version: config.version,
		name: 'OTA Bundle v' + config.version,

		bundle: {
			url: config.bundleUrl || ('https://cdn.example.com/bundles/' + config.version + '/bundle.zip'),
			hash: hash,
			size: bundleContent.length,
			signature: signature,
			keyId: config.keyId
		},

		rollout: {
			channel: config.channel,
			percentage: config.rolloutPercentage
		},

		metadata: {
			buildNumber: buildNumber,
			timestamp: timestamp,
			author: 'OTA Packager'
		}
	};

	return manifest;
}

/**
 * Create package (zip with bundle and manifest)
 */
function createPackage(config, bundleContent, manifest) {
	const outputDir = path.resolve(config.outputDir);
	const versionDir = path.join(outputDir, config.version);

	// Create output directory
	if (!fs.existsSync(versionDir)) {
		fs.mkdirSync(versionDir, { recursive: true });
	}

	// Write bundle file
	const bundlePath = path.join(versionDir, config.bundleName);
	fs.writeFileSync(bundlePath, bundleContent, 'utf8');

	// Write manifest file
	const manifestPath = path.join(versionDir, 'manifest.json');
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

	// Copy assets if present
	const buildAssetsDir = path.join(config.buildDir, 'assets');
	if (fs.existsSync(buildAssetsDir)) {
		const outputAssetsDir = path.join(versionDir, 'assets');
		copyRecursive(buildAssetsDir, outputAssetsDir);
	}

	// Create zip (requires zip command or archiver npm package)
	const zipPath = path.join(outputDir, config.version + '.zip');

	try {
		// Try using zip command
		const cwd = versionDir;
		execSync(`zip -r "${zipPath}" .`, { cwd, stdio: 'inherit' });
	} catch (error) {
		console.warn('⚠️  zip command failed, files are in:', versionDir);
		console.warn('⚠️  Manually zip the contents or install archiver npm package');
	}

	return versionDir;
}

/**
 * Upload package to CDN
 */
function uploadPackage(config, packagePath) {
	if (!config.uploadCommand) {
		console.warn('⚠️  No upload command specified');
		return;
	}

	try {
		const command = config.uploadCommand
			.replace('{{package}}', packagePath)
			.replace('{{version}}', config.version);

		console.log('Running:', command);
		execSync(command, { stdio: 'inherit' });

		console.log('✓ Upload complete');

	} catch (error) {
		console.error('✗ Upload failed:', error.message);
	}
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
	const args = process.argv.slice(2);

	// Parse CLI arguments
	const config = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--version' || arg === '-v') {
			config.version = args[++i];
		} else if (arg === '--channel' || arg === '-c') {
			config.channel = args[++i];
		} else if (arg === '--key-file' || arg === '-k') {
			config.privateKeyFile = args[++i];
		} else if (arg === '--upload' || arg === '-u') {
			config.upload = true;
		} else if (arg === '--config') {
			const configFile = args[++i];
			const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
			Object.assign(config, fileConfig);
		} else if (arg === '--help' || arg === '-h') {
			console.log('Usage: node packager.js [options]');
			console.log('');
			console.log('Options:');
			console.log('  --version, -v <version>    Bundle version (semver)');
			console.log('  --channel, -c <channel>    Release channel (default: production)');
			console.log('  --key-file, -k <file>      Ed25519 private key file');
			console.log('  --upload, -u               Upload to CDN');
			console.log('  --config <file>            Load config from JSON file');
			console.log('  --help, -h                 Show this help');
			console.log('');
			console.log('Example:');
			console.log('  node packager.js --version 1.2.3 --channel production --key-file private.key');
			console.log('');
			process.exit(0);
		}
	}

	// Run packager
	packageBundle(config)
		.then(result => {
			process.exit(result.success ? 0 : 1);
		})
		.catch(error => {
			console.error('Fatal error:', error);
			process.exit(1);
		});
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	packageBundle,
	calculateHash,
	signBundle,
	generateManifest
};
