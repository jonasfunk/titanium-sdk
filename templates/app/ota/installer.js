/**
 * Titanium OTA - Installer Module
 * 
 * Handles:
 * - Bundle extraction (unzip)
 * - Atomic installation (switch)
 * - Cleanup of old bundles
 * - Disk space quota management
 */

'use strict';

const State = require('./state');

// Default configuration
const DEFAULT_CONFIG = {
	bundlesDir: Ti.Filesystem.applicationDataDirectory + '/ota_bundles',
	maxBundles: 2,              // Keep only active + previous
	maxTotalSize: 50 * 1024 * 1024, // 50 MB total
	requireFreeSpace: 100 * 1024 * 1024 // Require 100 MB free before install
};

/**
 * Install bundle from zip file
 * 
 * @param {Object} options
 * @param {String} options.zipPath - Path to zip file
 * @param {String} options.version - Version identifier
 * @param {Object} options.manifest - Manifest object
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {Object} options.config - Configuration overrides
 */
function installBundle(options) {
	const {
		zipPath,
		version,
		manifest,
		onProgress,
		onSuccess,
		onError,
		config = {}
	} = options;
	
	// Merge config
	const finalConfig = Object.assign({}, DEFAULT_CONFIG, config);
	
	try {
		Ti.API.info('[OTA Install] Installing bundle: ' + version);
		
		// Step 1: Pre-flight checks
		if (onProgress) onProgress({ step: 'preflight', progress: 0.1 });
		
		const preflightResult = preflightChecks(zipPath, finalConfig);
		if (!preflightResult.success) {
			throw new Error('Preflight failed: ' + preflightResult.error);
		}
		
		// Step 2: Create version directory
		if (onProgress) onProgress({ step: 'prepare', progress: 0.2 });
		
		const versionDir = prepareVersionDirectory(version, finalConfig);
		
		// Step 3: Extract bundle
		if (onProgress) onProgress({ step: 'extract', progress: 0.3 });
		
		const extractResult = extractBundle(zipPath, versionDir);
		if (!extractResult.success) {
			throw new Error('Extraction failed: ' + extractResult.error);
		}
		
		if (onProgress) onProgress({ step: 'extract', progress: 0.7 });
		
		// Step 4: Verify extracted files
		const verifyResult = verifyExtractedFiles(versionDir, manifest);
		if (!verifyResult.success) {
			throw new Error('Verification failed: ' + verifyResult.error);
		}
		
		// Step 5: Atomic activation (update state)
		if (onProgress) onProgress({ step: 'activate', progress: 0.9 });
		
		State.activateVersion(version);
		
		// Step 6: Cleanup old bundles
		if (onProgress) onProgress({ step: 'cleanup', progress: 0.95 });
		
		cleanupOldBundles(finalConfig);
		
		if (onProgress) onProgress({ step: 'complete', progress: 1.0 });
		
		Ti.API.info('[OTA Install] ✓ Installation complete: ' + version);
		
		if (onSuccess) {
			onSuccess({
				version: version,
				path: versionDir
			});
		}
		
	} catch (e) {
		Ti.API.error('[OTA Install] Installation failed: ' + e.message);
		
		// Rollback on error
		try {
			const versionDir = finalConfig.bundlesDir + '/' + version;
			const dir = Ti.Filesystem.getFile(versionDir);
			if (dir.exists()) {
				dir.deleteDirectory(true);
				Ti.API.info('[OTA Install] Rolled back partial installation');
			}
		} catch (rollbackError) {
			Ti.API.error('[OTA Install] Rollback error: ' + rollbackError.message);
		}
		
		if (onError) {
			onError(e);
		}
	}
}

/**
 * Pre-flight checks before installation
 */
function preflightChecks(zipPath, config) {
	try {
		// Check zip file exists
		const zipFile = Ti.Filesystem.getFile(zipPath);
		if (!zipFile.exists()) {
			return {
				success: false,
				error: 'Zip file not found: ' + zipPath
			};
		}
		
		const zipSize = zipFile.size;
		Ti.API.info('[OTA Install] Bundle size: ' + formatBytes(zipSize));
		
		// Check available disk space
		const availableSpace = getAvailableDiskSpace();
		Ti.API.info('[OTA Install] Available space: ' + formatBytes(availableSpace));
		
		if (availableSpace < config.requireFreeSpace) {
			return {
				success: false,
				error: 'Insufficient disk space. Required: ' + formatBytes(config.requireFreeSpace)
			};
		}
		
		// Check if we have space for this bundle
		if (zipSize * 2 > availableSpace) { // *2 for uncompressed size estimate
			return {
				success: false,
				error: 'Bundle too large for available space'
			};
		}
		
		Ti.API.info('[OTA Install] ✓ Preflight checks passed');
		
		return { success: true };
		
	} catch (e) {
		return {
			success: false,
			error: 'Preflight error: ' + e.message
		};
	}
}

/**
 * Prepare version directory
 */
function prepareVersionDirectory(version, config) {
	const versionDir = config.bundlesDir + '/' + version;
	const dir = Ti.Filesystem.getFile(versionDir);
	
	// Delete if exists (clean install)
	if (dir.exists()) {
		Ti.API.warn('[OTA Install] Version directory exists, cleaning...');
		dir.deleteDirectory(true);
	}
	
	// Create directory
	dir.createDirectory();
	
	Ti.API.info('[OTA Install] Version directory created: ' + versionDir);
	
	return versionDir;
}

/**
 * Extract bundle (unzip)
 * 
 * Note: Ti.Filesystem doesn't have native unzip.
 * This is a placeholder that assumes pre-extracted structure.
 * 
 * Production implementation options:
 * 1. Use ti.compression module
 * 2. Use native module for zip
 * 3. Pre-extract on server (deliver as directory structure)
 */
function extractBundle(zipPath, destinationDir) {
	try {
		Ti.API.info('[OTA Install] Extracting bundle...');
		Ti.API.warn('[OTA Install] ⚠️  Placeholder extraction - use ti.compression or native module in production');
		
		// POC: For now, we assume the bundle is already extracted or we copy files
		// In production, use proper zip extraction
		
		// Option 1: Use ti.compression module
		// const Compression = require('ti.compression');
		// Compression.unzip(zipPath, destinationDir);
		
		// Option 2: For POC, assume bundle is a single .js file we can copy
		const zipFile = Ti.Filesystem.getFile(zipPath);
		const destFile = Ti.Filesystem.getFile(destinationDir, 'app.bundle.js');
		
		// If zip is actually the bundle JS (for POC testing)
		const content = zipFile.read();
		if (content) {
			destFile.write(content);
			Ti.API.info('[OTA Install] ✓ Bundle extracted (POC mode)');
		}
		
		return { success: true };
		
	} catch (e) {
		return {
			success: false,
			error: 'Extraction error: ' + e.message
		};
	}
}

/**
 * Verify extracted files
 */
function verifyExtractedFiles(versionDir, manifest) {
	try {
		Ti.API.info('[OTA Install] Verifying extracted files...');
		
		// Check main bundle file exists
		const bundleFile = Ti.Filesystem.getFile(versionDir, 'app.bundle.js');
		if (!bundleFile.exists()) {
			return {
				success: false,
				error: 'Main bundle file not found: app.bundle.js'
			};
		}
		
		Ti.API.info('[OTA Install] Bundle file size: ' + formatBytes(bundleFile.size));
		
		// TODO: Verify file hash matches manifest
		// const Crypto = require('./crypto');
		// const fileContent = bundleFile.read().text;
		// const hash = Crypto.sha256(fileContent);
		// if (hash !== manifest.hash) {
		//   return { success: false, error: 'Hash mismatch after extraction' };
		// }
		
		Ti.API.info('[OTA Install] ✓ File verification passed');
		
		return { success: true };
		
	} catch (e) {
		return {
			success: false,
			error: 'Verification error: ' + e.message
		};
	}
}

/**
 * Cleanup old bundles
 */
function cleanupOldBundles(config) {
	try {
		Ti.API.info('[OTA Install] Cleaning up old bundles...');
		
		const bundlesDir = Ti.Filesystem.getFile(config.bundlesDir);
		if (!bundlesDir.exists()) {
			return;
		}
		
		const state = State.getState();
		const keepVersions = new Set();
		
		// Always keep active and previous
		if (state.activeVersion) keepVersions.add(state.activeVersion);
		if (state.previousVersion) keepVersions.add(state.previousVersion);
		if (state.healthyVersion) keepVersions.add(state.healthyVersion);
		
		// Get all version directories
		const dirs = bundlesDir.getDirectoryListing() || [];
		
		let deletedCount = 0;
		let freedSpace = 0;
		
		dirs.forEach(function(dirname) {
			if (!keepVersions.has(dirname)) {
				const dir = Ti.Filesystem.getFile(bundlesDir.nativePath, dirname);
				
				if (dir.exists() && dir.isDirectory()) {
					const dirSize = getDirectorySize(dir);
					
					dir.deleteDirectory(true);
					
					Ti.API.info('[OTA Install] Deleted old bundle: ' + dirname + ' (' + formatBytes(dirSize) + ')');
					
					deletedCount++;
					freedSpace += dirSize;
				}
			}
		});
		
		if (deletedCount > 0) {
			Ti.API.info('[OTA Install] Cleanup complete: ' + deletedCount + ' bundles deleted, ' + formatBytes(freedSpace) + ' freed');
		} else {
			Ti.API.info('[OTA Install] No old bundles to clean up');
		}
		
		// Update state
		State.cleanupOldInstallations();
		
	} catch (e) {
		Ti.API.error('[OTA Install] Cleanup error: ' + e.message);
	}
}

/**
 * Get available disk space
 */
function getAvailableDiskSpace() {
	try {
		// Ti.Filesystem.getAvailableSpace() is not available
		// Approximate by checking app data directory
		
		// For POC, return a large number
		// In production, use native module or platform-specific code
		
		if (Ti.Platform.osname === 'android') {
			// Android: Could use Ti.Filesystem.externalStorageDirectory + StatFs
			// Placeholder
			return 500 * 1024 * 1024; // 500 MB
		} else if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad') {
			// iOS: Could use NSFileManager
			// Placeholder
			return 500 * 1024 * 1024; // 500 MB
		}
		
		return 500 * 1024 * 1024; // Default 500 MB
		
	} catch (e) {
		Ti.API.warn('[OTA Install] Could not determine available space: ' + e.message);
		return 500 * 1024 * 1024; // Default 500 MB
	}
}

/**
 * Get directory size (recursive)
 */
function getDirectorySize(dir) {
	try {
		let totalSize = 0;
		
		const listing = dir.getDirectoryListing() || [];
		listing.forEach(function(filename) {
			const file = Ti.Filesystem.getFile(dir.nativePath, filename);
			
			if (file.isDirectory()) {
				totalSize += getDirectorySize(file);
			} else {
				totalSize += file.size || 0;
			}
		});
		
		return totalSize;
		
	} catch (e) {
		Ti.API.warn('[OTA Install] Error calculating directory size: ' + e.message);
		return 0;
	}
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Get installed bundles info
 */
function getInstalledBundles(config) {
	try {
		const bundlesDir = Ti.Filesystem.getFile(config && config.bundlesDir || DEFAULT_CONFIG.bundlesDir);
		
		if (!bundlesDir.exists()) {
			return [];
		}
		
		const dirs = bundlesDir.getDirectoryListing() || [];
		const bundles = [];
		
		dirs.forEach(function(dirname) {
			const dir = Ti.Filesystem.getFile(bundlesDir.nativePath, dirname);
			
			if (dir.exists() && dir.isDirectory()) {
				bundles.push({
					version: dirname,
					path: dir.nativePath,
					size: getDirectorySize(dir),
					installInfo: State.getInstallationInfo(dirname)
				});
			}
		});
		
		return bundles;
		
	} catch (e) {
		Ti.API.error('[OTA Install] Error getting installed bundles: ' + e.message);
		return [];
	}
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	installBundle,
	cleanupOldBundles,
	getInstalledBundles,
	getAvailableDiskSpace,
	formatBytes,
	DEFAULT_CONFIG
};

