/**
 * Titanium OTA - Boot Module (POC)
 * 
 * Main entry point for OTA system.
 * Handles boot sequence, rollback detection, and bundle activation.
 */

'use strict';

const State = require('./state');
const Runtime = require('./runtime');
const Crypto = require('./crypto');

// POC Configuration
const POC_CONFIG = {
	debugMode: true,
	skipSignatureCheck: true, // POC only - enable in production
	bundleBasePath: Ti.Filesystem.applicationDataDirectory + '/ota_bundles'
};

/**
 * Initialize OTA system
 * 
 * @param {Object} config - Configuration options
 * @param {Function} onReady - Callback when ready (runtime)
 * @param {Function} onError - Callback on error
 */
function initialize(config, onReady, onError) {
	try {
		Ti.API.info('[OTA] ==============================================');
		Ti.API.info('[OTA] Initializing OTA System (POC)');
		Ti.API.info('[OTA] ==============================================');
		
		// Merge config with defaults
		const finalConfig = Object.assign({}, POC_CONFIG, config);
		
		// Record launch
		State.recordLaunch();
		
		// Check if rollback is needed
		if (State.shouldRollback()) {
			Ti.API.warn('[OTA] Rollback required!');
			handleRollback(finalConfig, onReady, onError);
			return;
		}
		
		// Load and activate bundle
		loadAndActivateBundle(finalConfig, onReady, onError);
		
	} catch (e) {
		Ti.API.error('[OTA] Initialization failed: ' + e.message);
		if (onError) {
			onError(e);
		}
	}
}

/**
 * Handle rollback scenario
 */
function handleRollback(config, onReady, onError) {
	try {
		const rollbackResult = State.rollback();
		
		if (!rollbackResult.success) {
			Ti.API.error('[OTA] Rollback failed: ' + rollbackResult.error);
			
			// Fall back to embedded app
			Ti.API.warn('[OTA] Falling back to embedded app');
			if (onReady) {
				onReady(createFallbackRuntime());
			}
			return;
		}
		
		Ti.API.info('[OTA] Rolled back from ' + rollbackResult.from + ' to ' + rollbackResult.to);
		
		// Load rolled-back version
		loadAndActivateBundle(config, onReady, onError);
		
	} catch (e) {
		Ti.API.error('[OTA] Rollback handling failed: ' + e.message);
		if (onError) {
			onError(e);
		}
	}
}

/**
 * Load and activate bundle
 */
function loadAndActivateBundle(config, onReady, onError) {
	try {
		const activeVersion = State.getActiveVersion();
		
		if (!activeVersion) {
			Ti.API.info('[OTA] No active version, using embedded app');
			if (onReady) {
				onReady(createFallbackRuntime());
			}
			return;
		}
		
		Ti.API.info('[OTA] Loading active version: ' + activeVersion);
		
		// Construct bundle path
		const bundlePath = config.bundleBasePath + '/' + activeVersion + '/app.bundle.js';
		
		// Load bundle
		const bundleCode = Runtime.loadBundleFromFile(bundlePath);
		
		if (!bundleCode) {
			Ti.API.error('[OTA] Failed to load bundle: ' + bundlePath);
			
			// Try rollback
			if (State.getPreviousVersion()) {
				Ti.API.warn('[OTA] Attempting automatic rollback...');
				handleRollback(config, onReady, onError);
				return;
			}
			
			// Fall back to embedded app
			Ti.API.warn('[OTA] Falling back to embedded app');
			if (onReady) {
				onReady(createFallbackRuntime());
			}
			return;
		}
		
		// Verify bundle (if configured)
		if (!config.skipSignatureCheck && config.publicKeys) {
			Ti.API.info('[OTA] Verifying bundle...');
			
			const verification = verifyBundleFile(bundlePath, config);
			
			if (!verification.valid) {
				Ti.API.error('[OTA] Bundle verification failed: ' + verification.error);
				
				// Try rollback
				if (State.getPreviousVersion()) {
					Ti.API.warn('[OTA] Attempting automatic rollback...');
					handleRollback(config, onReady, onError);
					return;
				}
				
				if (onError) {
					onError(new Error('Bundle verification failed: ' + verification.error));
				}
				return;
			}
			
			Ti.API.info('[OTA] Bundle verified successfully');
		}
		
		// Execute bundle
		const execution = Runtime.executeBundle(
			bundleCode,
			activeVersion,
			config.bundleBasePath + '/' + activeVersion
		);
		
		if (!execution.success) {
			Ti.API.error('[OTA] Bundle execution failed: ' + execution.error);
			
			// Try rollback
			if (State.getPreviousVersion()) {
				Ti.API.warn('[OTA] Attempting automatic rollback...');
				handleRollback(config, onReady, onError);
				return;
			}
			
			if (onError) {
				onError(new Error('Bundle execution failed: ' + execution.error));
			}
			return;
		}
		
		Ti.API.info('[OTA] Bundle activated successfully: ' + activeVersion);
		
		// Create runtime object
		const runtime = createRuntime(execution, activeVersion, config);
		
		if (onReady) {
			onReady(runtime);
		}
		
	} catch (e) {
		Ti.API.error('[OTA] Load and activate failed: ' + e.message);
		if (onError) {
			onError(e);
		}
	}
}

/**
 * Verify bundle file
 */
function verifyBundleFile(bundlePath, config) {
	try {
		// Load manifest
		const manifestPath = bundlePath.replace('/app.bundle.js', '/manifest.json');
		const manifestFile = Ti.Filesystem.getFile(manifestPath);
		
		if (!manifestFile.exists()) {
			return {
				valid: false,
				error: 'Manifest not found'
			};
		}
		
		const manifest = JSON.parse(manifestFile.read().text);
		
		// Load bundle
		const bundleFile = Ti.Filesystem.getFile(bundlePath);
		const bundleCode = bundleFile.read().text;
		
		// Verify
		return Crypto.verifyBundle(
			bundleCode,
			manifest.hash,
			manifest.signature,
			config.publicKeys.main || config.publicKeys[manifest.keyId]
		);
		
	} catch (e) {
		return {
			valid: false,
			error: 'Verification error: ' + e.message
		};
	}
}

/**
 * Create runtime object
 */
function createRuntime(execution, version, config) {
	return {
		version: version,
		config: config,
		execution: execution,
		
		/**
		 * Start the app
		 */
		start: function() {
			Ti.API.info('[OTA] Starting app runtime: ' + version);
			
			// App-specific startup logic would go here
			// For POC, just log
			Ti.API.info('[OTA] App started with OTA bundle: ' + version);
		},
		
		/**
		 * Mark current version as healthy
		 */
		markHealthy: function() {
			Ti.API.info('[OTA] Marking version as healthy: ' + version);
			return State.markHealthy(version);
		},
		
		/**
		 * Resolve asset URL
		 */
		resolveAsset: execution.resolveAsset,
		
		/**
		 * Get runtime info
		 */
		getInfo: function() {
			return {
				version: version,
				activeVersion: State.getActiveVersion(),
				healthyVersion: State.getHealthyVersion(),
				previousVersion: State.getPreviousVersion(),
				crashCount: State.getState().crashCount,
				installInfo: State.getInstallationInfo(version)
			};
		}
	};
}

/**
 * Create fallback runtime (embedded app)
 */
function createFallbackRuntime() {
	return {
		version: 'embedded',
		config: POC_CONFIG,
		
		start: function() {
			Ti.API.info('[OTA] Starting embedded app (fallback)');
		},
		
		markHealthy: function() {
			Ti.API.info('[OTA] Embedded app running');
			return true;
		},
		
		resolveAsset: function(path) {
			return path; // Use default Ti.Filesystem paths
		},
		
		getInfo: function() {
			return {
				version: 'embedded',
				activeVersion: State.getActiveVersion(),
				healthyVersion: State.getHealthyVersion(),
				previousVersion: State.getPreviousVersion(),
				crashCount: State.getState().crashCount
			};
		}
	};
}

/**
 * Manual healthy mark (convenience function)
 */
function markHealthy() {
	const version = State.getActiveVersion();
	if (version) {
		return State.markHealthy(version);
	}
	return false;
}

/**
 * Get current state (for debugging)
 */
function getState() {
	return State.getState();
}

/**
 * Reset state (for debugging/testing)
 */
function resetState() {
	return State.resetState();
}

/**
 * Install a new bundle (for testing)
 * 
 * @param {String} version - Version identifier
 * @param {String} bundleCode - Bundle JavaScript code
 * @param {Object} manifest - Bundle manifest
 */
function installBundle(version, bundleCode, manifest) {
	try {
		Ti.API.info('[OTA] Installing bundle: ' + version);
		
		// Create version directory
		const versionDir = Ti.Filesystem.getFile(POC_CONFIG.bundleBasePath, version);
		if (!versionDir.exists()) {
			versionDir.createDirectory();
		}
		
		// Write bundle file
		const bundleFile = Ti.Filesystem.getFile(versionDir.nativePath, 'app.bundle.js');
		bundleFile.write(bundleCode);
		
		// Write manifest
		const manifestFile = Ti.Filesystem.getFile(versionDir.nativePath, 'manifest.json');
		manifestFile.write(JSON.stringify(manifest, null, 2));
		
		// Activate version
		State.activateVersion(version);
		
		Ti.API.info('[OTA] Bundle installed successfully: ' + version);
		
		return {
			success: true,
			version: version
		};
		
	} catch (e) {
		Ti.API.error('[OTA] Bundle installation failed: ' + e.message);
		return {
			success: false,
			error: e.message
		};
	}
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	initialize,
	markHealthy,
	getState,
	resetState,
	installBundle
};

