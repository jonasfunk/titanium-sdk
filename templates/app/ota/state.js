/**
 * Titanium OTA - State Management (POC)
 * 
 * Manages:
 * - Active and previous bundle versions
 * - Healthy mark tracking
 * - Crash counter
 * - Rollback state
 */

'use strict';

const STATE_FILE = 'ota_state.json';
const MAX_CRASH_COUNT = 3;

/**
 * Default state structure
 */
function getDefaultState() {
	return {
		activeVersion: null,        // Currently active bundle version
		previousVersion: null,      // Previous bundle version (for rollback)
		healthyVersion: null,       // Last version marked as healthy
		crashCount: 0,              // Consecutive crash count
		lastLaunchTime: null,       // Last successful launch timestamp
		rollbackPending: false,     // Whether rollback is pending
		installations: {}           // Version -> {installTime, activatedTime, healthyTime}
	};
}

/**
 * Get current OTA state
 */
function getState() {
	try {
		const file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, STATE_FILE);
		
		if (!file.exists()) {
			Ti.API.info('[OTA] State file not found, creating default state');
			return getDefaultState();
		}
		
		const content = file.read().text;
		const state = JSON.parse(content);
		
		Ti.API.debug('[OTA] State loaded: ' + JSON.stringify(state, null, 2));
		
		return state;
		
	} catch (e) {
		Ti.API.error('[OTA] Error reading state: ' + e.message);
		return getDefaultState();
	}
}

/**
 * Save OTA state
 */
function saveState(state) {
	try {
		const file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, STATE_FILE);
		const content = JSON.stringify(state, null, 2);
		
		file.write(content);
		
		Ti.API.debug('[OTA] State saved: ' + JSON.stringify(state, null, 2));
		
		return true;
		
	} catch (e) {
		Ti.API.error('[OTA] Error saving state: ' + e.message);
		return false;
	}
}

/**
 * Mark current version as healthy
 */
function markHealthy(version) {
	const state = getState();
	
	if (!version) {
		version = state.activeVersion;
	}
	
	if (!version) {
		Ti.API.warn('[OTA] Cannot mark healthy: no active version');
		return false;
	}
	
	Ti.API.info('[OTA] Marking version as healthy: ' + version);
	
	state.healthyVersion = version;
	state.crashCount = 0;
	state.rollbackPending = false;
	
	if (state.installations[version]) {
		state.installations[version].healthyTime = Date.now();
	}
	
	return saveState(state);
}

/**
 * Record app launch
 */
function recordLaunch() {
	const state = getState();
	
	state.lastLaunchTime = Date.now();
	
	// Check if we need to increment crash counter
	// If app didn't mark healthy in previous session, it crashed
	if (state.activeVersion && state.activeVersion !== state.healthyVersion) {
		state.crashCount++;
		
		Ti.API.warn('[OTA] Crash detected. Count: ' + state.crashCount);
		
		// Auto-rollback if crash count exceeds threshold
		if (state.crashCount >= MAX_CRASH_COUNT) {
			Ti.API.error('[OTA] Max crash count reached. Marking for rollback.');
			state.rollbackPending = true;
		}
	}
	
	return saveState(state);
}

/**
 * Activate a new version
 */
function activateVersion(version) {
	const state = getState();
	
	Ti.API.info('[OTA] Activating version: ' + version);
	
	// Store current as previous
	if (state.activeVersion) {
		state.previousVersion = state.activeVersion;
	}
	
	state.activeVersion = version;
	state.crashCount = 0; // Reset crash counter for new version
	state.rollbackPending = false;
	
	// Update installation record
	if (!state.installations[version]) {
		state.installations[version] = {
			installTime: Date.now()
		};
	}
	
	state.installations[version].activatedTime = Date.now();
	
	return saveState(state);
}

/**
 * Rollback to previous version
 */
function rollback() {
	const state = getState();
	
	if (!state.previousVersion) {
		Ti.API.warn('[OTA] Cannot rollback: no previous version available');
		return {
			success: false,
			error: 'No previous version available'
		};
	}
	
	Ti.API.warn('[OTA] Rolling back from ' + state.activeVersion + ' to ' + state.previousVersion);
	
	const rolledBackFrom = state.activeVersion;
	const rolledBackTo = state.previousVersion;
	
	// Swap versions
	state.activeVersion = state.previousVersion;
	state.previousVersion = rolledBackFrom;
	state.crashCount = 0;
	state.rollbackPending = false;
	
	// Mark rolled-back version as unhealthy
	if (state.healthyVersion === rolledBackFrom) {
		state.healthyVersion = rolledBackTo;
	}
	
	saveState(state);
	
	return {
		success: true,
		from: rolledBackFrom,
		to: rolledBackTo
	};
}

/**
 * Check if rollback is needed
 */
function shouldRollback() {
	const state = getState();
	
	if (state.rollbackPending) {
		Ti.API.warn('[OTA] Rollback pending flag is set');
		return true;
	}
	
	if (state.crashCount >= MAX_CRASH_COUNT) {
		Ti.API.warn('[OTA] Crash count threshold exceeded: ' + state.crashCount);
		return true;
	}
	
	return false;
}

/**
 * Get active version
 */
function getActiveVersion() {
	const state = getState();
	return state.activeVersion;
}

/**
 * Get previous version
 */
function getPreviousVersion() {
	const state = getState();
	return state.previousVersion;
}

/**
 * Get healthy version
 */
function getHealthyVersion() {
	const state = getState();
	return state.healthyVersion;
}

/**
 * Reset state (for testing/debugging)
 */
function resetState() {
	Ti.API.warn('[OTA] Resetting state to default');
	return saveState(getDefaultState());
}

/**
 * Get installation info for a version
 */
function getInstallationInfo(version) {
	const state = getState();
	return state.installations[version] || null;
}

/**
 * Clean up old installations (keep only active and previous)
 */
function cleanupOldInstallations() {
	const state = getState();
	const keepVersions = new Set();
	
	if (state.activeVersion) keepVersions.add(state.activeVersion);
	if (state.previousVersion) keepVersions.add(state.previousVersion);
	if (state.healthyVersion) keepVersions.add(state.healthyVersion);
	
	// Remove installations not in keep set
	Object.keys(state.installations).forEach(version => {
		if (!keepVersions.has(version)) {
			Ti.API.info('[OTA] Removing old installation record: ' + version);
			delete state.installations[version];
		}
	});
	
	return saveState(state);
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	getState,
	saveState,
	markHealthy,
	recordLaunch,
	activateVersion,
	rollback,
	shouldRollback,
	getActiveVersion,
	getPreviousVersion,
	getHealthyVersion,
	resetState,
	getInstallationInfo,
	cleanupOldInstallations,
	MAX_CRASH_COUNT
};

