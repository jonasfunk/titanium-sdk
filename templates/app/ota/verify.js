/**
 * Titanium OTA - Verification Module
 * 
 * Handles:
 * - SHA-256 hash verification
 * - Ed25519 signature verification
 * - Public key management (keyring)
 * - Manifest validation
 */

'use strict';

const Crypto = require('./crypto');

/**
 * Verify bundle integrity and authenticity
 * 
 * @param {Object} options
 * @param {String} options.bundleData - Bundle content
 * @param {String} options.expectedHash - Expected SHA-256 hash
 * @param {String} options.signature - Ed25519 signature
 * @param {String} options.publicKey - Ed25519 public key
 * @param {Boolean} options.skipSignature - Skip signature check (debug only)
 * @returns {Object} {valid: boolean, error?: string, details?: object}
 */
function verifyBundle(options) {
	const {
		bundleData,
		expectedHash,
		signature,
		publicKey,
		skipSignature = false
	} = options;
	
	try {
		// Step 1: Verify SHA-256 hash
		Ti.API.info('[OTA Verify] Computing SHA-256 hash...');
		
		const actualHash = Crypto.sha256(bundleData);
		
		Ti.API.debug('[OTA Verify] Expected hash: ' + expectedHash);
		Ti.API.debug('[OTA Verify] Actual hash:   ' + actualHash);
		
		if (actualHash !== expectedHash) {
			return {
				valid: false,
				error: 'Hash mismatch: bundle integrity check failed',
				details: {
					expected: expectedHash,
					actual: actualHash
				}
			};
		}
		
		Ti.API.info('[OTA Verify] ✓ Hash verification passed');
		
		// Step 2: Verify Ed25519 signature
		if (!skipSignature) {
			Ti.API.info('[OTA Verify] Verifying Ed25519 signature...');
			
			if (!signature || !publicKey) {
				return {
					valid: false,
					error: 'Missing signature or public key'
				};
			}
			
			const signatureValid = Crypto.verifyEd25519Signature(
				expectedHash,
				signature,
				publicKey
			);
			
			if (!signatureValid) {
				return {
					valid: false,
					error: 'Invalid signature: bundle authenticity check failed'
				};
			}
			
			Ti.API.info('[OTA Verify] ✓ Signature verification passed');
		} else {
			Ti.API.warn('[OTA Verify] ⚠️  Signature verification SKIPPED (debug mode)');
		}
		
		return {
			valid: true,
			details: {
				hash: actualHash,
				signatureChecked: !skipSignature
			}
		};
		
	} catch (e) {
		Ti.API.error('[OTA Verify] Verification error: ' + e.message);
		return {
			valid: false,
			error: 'Verification error: ' + e.message
		};
	}
}

/**
 * Verify manifest structure and content
 * 
 * @param {Object} manifest - Manifest object to verify
 * @returns {Object} {valid: boolean, error?: string}
 */
function verifyManifest(manifest) {
	try {
		// Required fields
		const requiredFields = ['version', 'hash', 'signature', 'timestamp'];
		
		for (const field of requiredFields) {
			if (!manifest[field]) {
				return {
					valid: false,
					error: 'Missing required field: ' + field
				};
			}
		}
		
		// Validate version format (semver-like)
		if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
			return {
				valid: false,
				error: 'Invalid version format: ' + manifest.version
			};
		}
		
		// Validate hash format (64 hex chars for SHA-256)
		if (!/^[a-f0-9]{64}$/i.test(manifest.hash)) {
			return {
				valid: false,
				error: 'Invalid hash format: ' + manifest.hash
			};
		}
		
		// Validate signature format (128 hex chars for Ed25519)
		if (!/^[a-f0-9]{128}$/i.test(manifest.signature)) {
			return {
				valid: false,
				error: 'Invalid signature format'
			};
		}
		
		// Validate timestamp
		if (typeof manifest.timestamp !== 'number' || manifest.timestamp <= 0) {
			return {
				valid: false,
				error: 'Invalid timestamp'
			};
		}
		
		// Validate optional fields
		if (manifest.minSDKVersion && !/^\d+\.\d+\.\d+/.test(manifest.minSDKVersion)) {
			return {
				valid: false,
				error: 'Invalid minSDKVersion format'
			};
		}
		
		if (manifest.maxSDKVersion && !/^\d+\.\d+\.\d+/.test(manifest.maxSDKVersion)) {
			return {
				valid: false,
				error: 'Invalid maxSDKVersion format'
			};
		}
		
		Ti.API.info('[OTA Verify] ✓ Manifest structure valid');
		
		return {
			valid: true
		};
		
	} catch (e) {
		return {
			valid: false,
			error: 'Manifest validation error: ' + e.message
		};
	}
}

/**
 * Public key management (keyring)
 */
class Keyring {
	constructor(keys) {
		this.keys = keys || {};
	}
	
	/**
	 * Get public key by ID
	 */
	getKey(keyId) {
		return this.keys[keyId] || null;
	}
	
	/**
	 * Add public key
	 */
	addKey(keyId, publicKey) {
		if (!publicKey || !/^[a-f0-9]{64}$/i.test(publicKey)) {
			throw new Error('Invalid public key format');
		}
		this.keys[keyId] = publicKey;
	}
	
	/**
	 * Remove public key
	 */
	removeKey(keyId) {
		delete this.keys[keyId];
	}
	
	/**
	 * Has key?
	 */
	hasKey(keyId) {
		return !!this.keys[keyId];
	}
	
	/**
	 * Get all key IDs
	 */
	getKeyIds() {
		return Object.keys(this.keys);
	}
}

/**
 * Verify bundle with keyring support
 * 
 * @param {Object} options
 * @param {String} options.bundleData - Bundle content
 * @param {Object} options.manifest - Manifest object
 * @param {Keyring} options.keyring - Keyring instance
 * @param {Boolean} options.skipSignature - Skip signature check (debug only)
 * @returns {Object} Verification result
 */
function verifyBundleWithManifest(options) {
	const {
		bundleData,
		manifest,
		keyring,
		skipSignature = false
	} = options;
	
	try {
		// Step 1: Verify manifest structure
		Ti.API.info('[OTA Verify] Verifying manifest structure...');
		
		const manifestCheck = verifyManifest(manifest);
		if (!manifestCheck.valid) {
			return manifestCheck;
		}
		
		// Step 2: Get public key from keyring
		let publicKey = null;
		
		if (!skipSignature) {
			const keyId = manifest.keyId || 'main';
			publicKey = keyring.getKey(keyId);
			
			if (!publicKey) {
				return {
					valid: false,
					error: 'Public key not found for keyId: ' + keyId
				};
			}
			
			Ti.API.debug('[OTA Verify] Using public key: ' + keyId);
		}
		
		// Step 3: Verify bundle
		return verifyBundle({
			bundleData: bundleData,
			expectedHash: manifest.hash,
			signature: manifest.signature,
			publicKey: publicKey,
			skipSignature: skipSignature
		});
		
	} catch (e) {
		return {
			valid: false,
			error: 'Bundle verification error: ' + e.message
		};
	}
}

/**
 * Check SDK version compatibility
 * 
 * @param {String} currentSDKVersion - Current SDK version
 * @param {String} minSDKVersion - Minimum required SDK version
 * @param {String} maxSDKVersion - Maximum supported SDK version (optional)
 * @returns {Boolean} True if compatible
 */
function checkSDKCompatibility(currentSDKVersion, minSDKVersion, maxSDKVersion) {
	try {
		const current = parseVersion(currentSDKVersion);
		const min = parseVersion(minSDKVersion);
		
		// Check minimum version
		if (compareVersions(current, min) < 0) {
			Ti.API.warn('[OTA Verify] SDK version too old: ' + currentSDKVersion + ' < ' + minSDKVersion);
			return false;
		}
		
		// Check maximum version if specified
		if (maxSDKVersion) {
			const max = parseVersion(maxSDKVersion);
			if (compareVersions(current, max) > 0) {
				Ti.API.warn('[OTA Verify] SDK version too new: ' + currentSDKVersion + ' > ' + maxSDKVersion);
				return false;
			}
		}
		
		return true;
		
	} catch (e) {
		Ti.API.error('[OTA Verify] Version comparison error: ' + e.message);
		return false;
	}
}

/**
 * Parse version string (semver)
 */
function parseVersion(version) {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
	if (!match) {
		throw new Error('Invalid version format: ' + version);
	}
	return {
		major: parseInt(match[1], 10),
		minor: parseInt(match[2], 10),
		patch: parseInt(match[3], 10)
	};
}

/**
 * Compare two version objects
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a, b) {
	if (a.major !== b.major) return a.major - b.major;
	if (a.minor !== b.minor) return a.minor - b.minor;
	return a.patch - b.patch;
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	verifyBundle,
	verifyManifest,
	verifyBundleWithManifest,
	checkSDKCompatibility,
	Keyring,
	parseVersion,
	compareVersions
};

