/**
 * Titanium OTA - POC Demo Application
 *
 * Demonstrates:
 * 1. OTA initialization
 * 2. Bundle installation (for testing)
 * 3. Healthy mark
 * 4. Rollback scenario
 */

'use strict';

// Copy OTA modules to accessible location for testing
// In production, these would be in Resources/ota/
const OTA = require('../../templates/app/ota/boot');
const Crypto = require('../../templates/app/ota/crypto');

Ti.API.info('====================================');
Ti.API.info('Titanium OTA - POC Demo');
Ti.API.info('====================================');

// Demo bundles
const DEMO_BUNDLES = {
	'1.0.0': {
		code: `
			Ti.API.info('[Bundle 1.0.0] Initializing...');
			
			const win = Ti.UI.createWindow({
				backgroundColor: '#4CAF50',
				layout: 'vertical'
			});
			
			const title = Ti.UI.createLabel({
				text: 'OTA Bundle v1.0.0',
				color: '#fff',
				font: { fontSize: 24, fontWeight: 'bold' },
				top: 50,
				height: Ti.UI.SIZE
			});
			
			const subtitle = Ti.UI.createLabel({
				text: 'This is a dynamically loaded bundle!',
				color: '#fff',
				font: { fontSize: 16 },
				top: 10,
				height: Ti.UI.SIZE
			});
			
			const info = Ti.UI.createLabel({
				text: 'Version: 1.0.0\\nStatus: Loaded via OTA',
				color: '#fff',
				font: { fontSize: 14 },
				top: 30,
				textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
				height: Ti.UI.SIZE
			});
			
			win.add(title);
			win.add(subtitle);
			win.add(info);
			
			win.open();
			
			Ti.API.info('[Bundle 1.0.0] Window opened successfully');
		`,
		name: 'Stable Bundle'
	},

	'2.0.0': {
		code: `
			Ti.API.info('[Bundle 2.0.0] Initializing...');
			
			const win = Ti.UI.createWindow({
				backgroundColor: '#2196F3',
				layout: 'vertical'
			});
			
			const title = Ti.UI.createLabel({
				text: 'OTA Bundle v2.0.0',
				color: '#fff',
				font: { fontSize: 24, fontWeight: 'bold' },
				top: 50,
				height: Ti.UI.SIZE
			});
			
			const subtitle = Ti.UI.createLabel({
				text: 'Updated features!',
				color: '#fff',
				font: { fontSize: 16 },
				top: 10,
				height: Ti.UI.SIZE
			});
			
			win.add(title);
			win.add(subtitle);
			
			win.open();
			
			Ti.API.info('[Bundle 2.0.0] Window opened successfully');
		`,
		name: 'Updated Bundle'
	},

	crash: {
		code: `
			Ti.API.info('[Bundle CRASH] Initializing...');
			
			// Intentional crash for rollback testing
			setTimeout(function() {
				Ti.API.error('[Bundle CRASH] Triggering intentional crash...');
				throw new Error('Intentional crash for rollback testing');
			}, 1000);
		`,
		name: 'Crash Test Bundle'
	}
};

/**
 * Create demo UI
 */
function createDemoUI() {
	const win = Ti.UI.createWindow({
		backgroundColor: '#f5f5f5',
		title: 'OTA POC Demo',
		layout: 'vertical'
	});

	const scrollView = Ti.UI.createScrollView({
		layout: 'vertical',
		width: Ti.UI.FILL,
		height: Ti.UI.FILL
	});

	// Title
	scrollView.add(Ti.UI.createLabel({
		text: 'Titanium OTA - POC Demo',
		font: { fontSize: 24, fontWeight: 'bold' },
		color: '#333',
		top: 20,
		height: Ti.UI.SIZE
	}));

	// Current state
	const stateLabel = Ti.UI.createLabel({
		text: 'Loading state...',
		font: { fontSize: 12, fontFamily: 'monospace' },
		color: '#666',
		top: 20,
		left: 20,
		right: 20,
		height: Ti.UI.SIZE
	});
	scrollView.add(stateLabel);

	function updateStateLabel() {
		const state = OTA.getState();
		stateLabel.text = 'State:\n' + JSON.stringify(state, null, 2);
	}

	updateStateLabel();

	// Buttons
	const buttonContainer = Ti.UI.createView({
		layout: 'vertical',
		top: 20,
		left: 20,
		right: 20,
		height: Ti.UI.SIZE
	});

	function createButton(title, onClick) {
		const btn = Ti.UI.createButton({
			title: title,
			top: 10,
			height: 50,
			backgroundColor: '#2196F3',
			color: '#fff',
			font: { fontSize: 16 }
		});
		btn.addEventListener('click', onClick);
		return btn;
	}

	// Install v1.0.0
	buttonContainer.add(createButton('Install Bundle v1.0.0', function () {
		installBundle('1.0.0');
		updateStateLabel();
	}));

	// Install v2.0.0
	buttonContainer.add(createButton('Install Bundle v2.0.0', function () {
		installBundle('2.0.0');
		updateStateLabel();
	}));

	// Install crash bundle
	buttonContainer.add(createButton('Install CRASH Bundle (Test Rollback)', function () {
		installBundle('crash');
		updateStateLabel();
	}));

	// Mark healthy
	buttonContainer.add(createButton('Mark Current Bundle Healthy', function () {
		OTA.markHealthy();
		updateStateLabel();
		alert('Marked as healthy!');
	}));

	// Show state
	buttonContainer.add(createButton('Refresh State', function () {
		updateStateLabel();
	}));

	// Reset state
	buttonContainer.add(createButton('Reset State', function () {
		OTA.resetState();
		updateStateLabel();
		alert('State reset!');
	}));

	// Test SHA-256
	buttonContainer.add(createButton('Test SHA-256', function () {
		testSHA256();
	}));

	scrollView.add(buttonContainer);

	// Instructions
	scrollView.add(Ti.UI.createLabel({
		text: 'Instructions:\n'
			+ '1. Install a bundle (v1.0.0 or v2.0.0)\n'
			+ '2. Restart the app\n'
			+ '3. Bundle should load automatically\n'
			+ '4. Mark it healthy to confirm\n\n'
			+ 'Rollback Test:\n'
			+ '1. Install CRASH bundle\n'
			+ '2. Restart app 3 times\n'
			+ '3. Should auto-rollback to previous',
		font: { fontSize: 12 },
		color: '#666',
		top: 30,
		left: 20,
		right: 20,
		height: Ti.UI.SIZE
	}));

	win.add(scrollView);

	return win;
}

/**
 * Install a demo bundle
 */
function installBundle(version) {
	const bundle = DEMO_BUNDLES[version];

	if (!bundle) {
		alert('Bundle not found: ' + version);
		return;
	}

	Ti.API.info('Installing bundle: ' + version);

	// Calculate hash
	const hash = Crypto.sha256(bundle.code);

	// Create manifest
	const manifest = {
		version: version,
		name: bundle.name,
		hash: hash,
		signature: '0'.repeat(128), // Placeholder signature
		keyId: 'main',
		timestamp: Date.now(),
		description: 'Demo bundle for OTA POC'
	};

	// Install
	const result = OTA.installBundle(version, bundle.code, manifest);

	if (result.success) {
		alert('Bundle ' + version + ' installed!\n\nRestart the app to activate it.');
	} else {
		alert('Installation failed: ' + result.error);
	}
}

/**
 * Test SHA-256 implementation
 */
function testSHA256() {
	const tests = [
		{
			input: '',
			expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
		},
		{
			input: 'hello',
			expected: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
		},
		{
			input: 'The quick brown fox jumps over the lazy dog',
			expected: 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
		}
	];

	let passed = 0;
	let failed = 0;

	tests.forEach(function (test) {
		const result = Crypto.sha256(test.input);
		if (result === test.expected) {
			Ti.API.info('✓ SHA-256 test passed: "' + test.input + '"');
			passed++;
		} else {
			Ti.API.error('✗ SHA-256 test failed: "' + test.input + '"');
			Ti.API.error('  Expected: ' + test.expected);
			Ti.API.error('  Got:      ' + result);
			failed++;
		}
	});

	alert('SHA-256 Tests:\nPassed: ' + passed + '\nFailed: ' + failed);
}

/**
 * Main entry point
 */
function main() {
	// Check if we have an active OTA bundle
	const state = OTA.getState();

	if (state.activeVersion) {
		Ti.API.info('Active OTA version detected: ' + state.activeVersion);
		Ti.API.info('Initializing OTA system...');

		// Initialize OTA
		OTA.initialize({
			debugMode: true,
			skipSignatureCheck: true, // POC only
			bundleBasePath: Ti.Filesystem.applicationDataDirectory + '/ota_bundles'
		}, function onReady(runtime) {
			Ti.API.info('OTA bundle loaded: ' + runtime.version);

			// Mark healthy after 2 seconds (simulating successful UI load)
			setTimeout(function () {
				Ti.API.info('Auto-marking bundle as healthy...');
				runtime.markHealthy();
			}, 2000);

		}, function onError(err) {
			Ti.API.error('OTA initialization failed: ' + err.message);

			// Show demo UI as fallback
			createDemoUI().open();
		});

	} else {
		Ti.API.info('No OTA bundle active, showing demo UI');

		// Show demo UI
		createDemoUI().open();
	}
}

// Start
main();
