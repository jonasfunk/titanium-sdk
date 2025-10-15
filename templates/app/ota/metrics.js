/**
 * Titanium OTA - Metrics Module
 * 
 * Handles:
 * - Event tracking and reporting
 * - Metrics payload generation
 * - Batch reporting
 * - Error tracking
 */

'use strict';

// Default configuration
const DEFAULT_CONFIG = {
	enabled: true,
	endpoint: null,
	batchSize: 10,
	batchInterval: 30000, // 30 seconds
	timeout: 10000,
	includeDeviceInfo: true,
	events: [
		'check', 'updateAvailable',
		'downloadStart', 'downloadProgress', 'downloadComplete', 'downloadError',
		'verifySuccess', 'verifyFailed',
		'installStart', 'installComplete', 'installError',
		'activate', 'healthy', 'rollback', 'error'
	]
};

/**
 * Metrics collector
 */
class MetricsCollector {
	constructor(config = {}) {
		this.config = Object.assign({}, DEFAULT_CONFIG, config);
		this.eventQueue = [];
		this.batchTimer = null;
		this.sessionId = generateSessionId();
		this.deviceInfo = this.config.includeDeviceInfo ? getDeviceInfo() : null;
	}
	
	/**
	 * Track event
	 */
	track(eventName, data = {}) {
		if (!this.config.enabled) {
			return;
		}
		
		if (!this.config.events.includes(eventName)) {
			Ti.API.debug('[OTA Metrics] Event not in allowed list: ' + eventName);
			return;
		}
		
		const event = this.createEvent(eventName, data);
		
		Ti.API.debug('[OTA Metrics] Tracked: ' + eventName);
		
		this.eventQueue.push(event);
		
		// Auto-flush if batch size reached
		if (this.eventQueue.length >= this.config.batchSize) {
			this.flush();
		} else if (!this.batchTimer) {
			// Schedule batch flush
			this.batchTimer = setTimeout(() => {
				this.flush();
			}, this.config.batchInterval);
		}
	}
	
	/**
	 * Create event payload
	 */
	createEvent(eventName, data) {
		const event = {
			event: eventName,
			timestamp: Date.now(),
			sessionId: this.sessionId,
			...data
		};
		
		// Add device info
		if (this.deviceInfo) {
			event.device = this.deviceInfo;
		}
		
		return event;
	}
	
	/**
	 * Flush event queue
	 */
	flush() {
		if (this.eventQueue.length === 0) {
			return;
		}
		
		if (!this.config.endpoint) {
			Ti.API.warn('[OTA Metrics] No endpoint configured, discarding ' + this.eventQueue.length + ' events');
			this.eventQueue = [];
			return;
		}
		
		const events = this.eventQueue.splice(0, this.config.batchSize);
		
		Ti.API.info('[OTA Metrics] Flushing ' + events.length + ' events to ' + this.config.endpoint);
		
		// Clear batch timer
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}
		
		// Send events
		this.sendEvents(events);
	}
	
	/**
	 * Send events to endpoint
	 */
	sendEvents(events) {
		try {
			const client = Ti.Network.createHTTPClient({
				timeout: this.config.timeout,
				
				onload: function() {
					Ti.API.info('[OTA Metrics] Events sent successfully');
				},
				
				onerror: function(e) {
					Ti.API.error('[OTA Metrics] Failed to send events: ' + (e.error || 'Unknown error'));
				}
			});
			
			const payload = {
				events: events,
				batch: {
					timestamp: Date.now(),
					count: events.length
				}
			};
			
			client.open('POST', this.config.endpoint);
			client.setRequestHeader('Content-Type', 'application/json');
			client.send(JSON.stringify(payload));
			
		} catch (e) {
			Ti.API.error('[OTA Metrics] Error sending events: ' + e.message);
		}
	}
	
	/**
	 * Track OTA check
	 */
	trackCheck(currentVersion, manifestUrl) {
		this.track('check', {
			currentVersion: currentVersion,
			manifestUrl: manifestUrl
		});
	}
	
	/**
	 * Track update available
	 */
	trackUpdateAvailable(currentVersion, newVersion, manifest) {
		this.track('updateAvailable', {
			currentVersion: currentVersion,
			newVersion: newVersion,
			channel: manifest.rollout?.channel,
			bundleSize: manifest.bundle?.size
		});
	}
	
	/**
	 * Track download start
	 */
	trackDownloadStart(version, url) {
		this.track('downloadStart', {
			version: version,
			url: url,
			startTime: Date.now()
		});
	}
	
	/**
	 * Track download progress
	 */
	trackDownloadProgress(version, progress, bytesReceived, totalBytes) {
		// Only track at intervals to avoid spam
		if (progress % 0.25 < 0.01) { // Every 25%
			this.track('downloadProgress', {
				version: version,
				progress: progress,
				bytesReceived: bytesReceived,
				totalBytes: totalBytes
			});
		}
	}
	
	/**
	 * Track download complete
	 */
	trackDownloadComplete(version, duration, size) {
		this.track('downloadComplete', {
			version: version,
			duration: duration,
			size: size,
			speed: size / (duration / 1000) // bytes per second
		});
	}
	
	/**
	 * Track download error
	 */
	trackDownloadError(version, error) {
		this.track('downloadError', {
			version: version,
			error: error.message,
			errorCode: error.code
		});
	}
	
	/**
	 * Track verification success
	 */
	trackVerifySuccess(version, duration) {
		this.track('verifySuccess', {
			version: version,
			duration: duration
		});
	}
	
	/**
	 * Track verification failed
	 */
	trackVerifyFailed(version, reason) {
		this.track('verifyFailed', {
			version: version,
			reason: reason
		});
	}
	
	/**
	 * Track installation start
	 */
	trackInstallStart(version) {
		this.track('installStart', {
			version: version,
			startTime: Date.now()
		});
	}
	
	/**
	 * Track installation complete
	 */
	trackInstallComplete(version, duration) {
		this.track('installComplete', {
			version: version,
			duration: duration
		});
	}
	
	/**
	 * Track installation error
	 */
	trackInstallError(version, error) {
		this.track('installError', {
			version: version,
			error: error.message,
			step: error.step
		});
	}
	
	/**
	 * Track bundle activation
	 */
	trackActivate(version, previousVersion) {
		this.track('activate', {
			version: version,
			previousVersion: previousVersion
		});
	}
	
	/**
	 * Track healthy mark
	 */
	trackHealthy(version, timeToHealthy) {
		this.track('healthy', {
			version: version,
			timeToHealthy: timeToHealthy
		});
	}
	
	/**
	 * Track rollback
	 */
	trackRollback(fromVersion, toVersion, reason, crashCount) {
		this.track('rollback', {
			fromVersion: fromVersion,
			toVersion: toVersion,
			reason: reason,
			crashCount: crashCount
		});
	}
	
	/**
	 * Track general error
	 */
	trackError(error, context) {
		this.track('error', {
			error: error.message,
			stack: error.stack,
			context: context
		});
	}
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
	return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Get device info
 */
function getDeviceInfo() {
	try {
		return {
			platform: Ti.Platform.osname,
			platformVersion: Ti.Platform.version,
			sdkVersion: Ti.version,
			model: Ti.Platform.model,
			manufacturer: Ti.Platform.manufacturer,
			locale: Ti.Platform.locale,
			networkType: Ti.Network.networkTypeName,
			screenWidth: Ti.Platform.displayCaps.platformWidth,
			screenHeight: Ti.Platform.displayCaps.platformHeight,
			screenDensity: Ti.Platform.displayCaps.dpi
		};
	} catch (e) {
		Ti.API.warn('[OTA Metrics] Error getting device info: ' + e.message);
		return null;
	}
}

/**
 * Create metrics instance
 */
function createMetrics(config) {
	return new MetricsCollector(config);
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	MetricsCollector,
	createMetrics,
	DEFAULT_CONFIG
};

