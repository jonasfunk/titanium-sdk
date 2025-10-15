/**
 * Titanium OTA - CDN Failover & Manifest Cache
 * 
 * Handles:
 * - Multiple CDN URL failover
 * - Manifest caching with TTL
 * - Exponential backoff
 * - Health tracking for CDN endpoints
 */

'use strict';

const Downloader = require('./downloader');

// Default configuration
const DEFAULT_CONFIG = {
	manifestTTL: 3600000,        // 1 hour
	manifestCachePath: Ti.Filesystem.applicationDataDirectory + '/ota_manifest_cache.json',
	cdnHealthTTL: 300000,        // 5 minutes
	maxBackoff: 60000,           // 1 minute
	initialBackoff: 1000         // 1 second
};

/**
 * CDN Manager with failover and caching
 */
class CDNManager {
	constructor(config = {}) {
		this.config = Object.assign({}, DEFAULT_CONFIG, config);
		this.cdnHealth = {}; // Track CDN endpoint health
		this.manifestCache = this.loadManifestCache();
	}
	
	/**
	 * Fetch manifest with failover and caching
	 * 
	 * @param {Array|String} urls - Manifest URLs (single or array)
	 * @param {Boolean} forceRefresh - Skip cache
	 * @returns {Promise} Resolves with manifest object
	 */
	fetchManifest(urls, forceRefresh = false) {
		return new Promise((resolve, reject) => {
			const urlArray = Array.isArray(urls) ? urls : [urls];
			
			// Check cache first
			if (!forceRefresh) {
				const cached = this.getCachedManifest(urlArray[0]);
				if (cached) {
					Ti.API.info('[OTA CDN] Using cached manifest (age: ' + 
						this.getCacheAge(cached) + 'ms)');
					resolve(cached.manifest);
					return;
				}
			}
			
			// Fetch from CDN with failover
			this.fetchManifestWithFailover(urlArray, 0, resolve, reject);
		});
	}
	
	/**
	 * Fetch manifest with failover logic
	 */
	fetchManifestWithFailover(urls, urlIndex, resolve, reject) {
		if (urlIndex >= urls.length) {
			const error = new Error('All CDN endpoints failed');
			Ti.API.error('[OTA CDN] ' + error.message);
			
			// Try to use stale cache as last resort
			const staleManifest = this.getStaleManifest();
			if (staleManifest) {
				Ti.API.warn('[OTA CDN] Using stale cached manifest as fallback');
				resolve(staleManifest.manifest);
				return;
			}
			
			reject(error);
			return;
		}
		
		const url = urls[urlIndex];
		
		// Check if CDN is healthy
		if (!this.isCDNHealthy(url)) {
			const backoff = this.getCDNBackoff(url);
			Ti.API.warn('[OTA CDN] CDN marked unhealthy, waiting ' + backoff + 'ms: ' + url);
			
			setTimeout(() => {
				this.fetchManifestWithFailover(urls, urlIndex + 1, resolve, reject);
			}, backoff);
			return;
		}
		
		Ti.API.info('[OTA CDN] Fetching from CDN [' + (urlIndex + 1) + '/' + urls.length + ']: ' + url);
		
		const startTime = Date.now();
		
		Downloader.downloadManifest(
			url,
			(manifest) => {
				const duration = Date.now() - startTime;
				Ti.API.info('[OTA CDN] Manifest fetched successfully (took ' + duration + 'ms)');
				
				// Mark CDN as healthy
				this.markCDNHealthy(url);
				
				// Cache manifest
				this.cacheManifest(url, manifest);
				
				resolve(manifest);
			},
			(error) => {
				Ti.API.warn('[OTA CDN] CDN failed: ' + url);
				Ti.API.warn('[OTA CDN] Error: ' + error.message);
				
				// Mark CDN as unhealthy
				this.markCDNUnhealthy(url);
				
				// Try next CDN
				this.fetchManifestWithFailover(urls, urlIndex + 1, resolve, reject);
			},
			{
				timeout: 15000, // Shorter timeout for manifest
				maxRetries: 1   // Single retry per CDN
			}
		);
	}
	
	/**
	 * Get cached manifest
	 */
	getCachedManifest(url) {
		const cache = this.manifestCache[url];
		
		if (!cache) {
			return null;
		}
		
		const age = Date.now() - cache.timestamp;
		
		if (age > this.config.manifestTTL) {
			Ti.API.debug('[OTA CDN] Cache expired for: ' + url);
			return null;
		}
		
		return cache;
	}
	
	/**
	 * Get stale manifest (beyond TTL) as fallback
	 */
	getStaleManifest() {
		// Return any cached manifest, even if expired
		const urls = Object.keys(this.manifestCache);
		
		if (urls.length === 0) {
			return null;
		}
		
		// Return most recent
		let mostRecent = null;
		
		urls.forEach(url => {
			const cache = this.manifestCache[url];
			if (!mostRecent || cache.timestamp > mostRecent.timestamp) {
				mostRecent = cache;
			}
		});
		
		return mostRecent;
	}
	
	/**
	 * Get cache age
	 */
	getCacheAge(cache) {
		return Date.now() - cache.timestamp;
	}
	
	/**
	 * Cache manifest
	 */
	cacheManifest(url, manifest) {
		this.manifestCache[url] = {
			manifest: manifest,
			timestamp: Date.now(),
			url: url
		};
		
		this.saveManifestCache();
		
		Ti.API.debug('[OTA CDN] Manifest cached for: ' + url);
	}
	
	/**
	 * Load manifest cache from disk
	 */
	loadManifestCache() {
		try {
			const file = Ti.Filesystem.getFile(this.config.manifestCachePath);
			
			if (!file.exists()) {
				return {};
			}
			
			const content = file.read().text;
			const cache = JSON.parse(content);
			
			Ti.API.debug('[OTA CDN] Manifest cache loaded');
			
			return cache;
			
		} catch (e) {
			Ti.API.warn('[OTA CDN] Error loading manifest cache: ' + e.message);
			return {};
		}
	}
	
	/**
	 * Save manifest cache to disk
	 */
	saveManifestCache() {
		try {
			const file = Ti.Filesystem.getFile(this.config.manifestCachePath);
			const content = JSON.stringify(this.manifestCache, null, 2);
			
			file.write(content);
			
			Ti.API.debug('[OTA CDN] Manifest cache saved');
			
		} catch (e) {
			Ti.API.error('[OTA CDN] Error saving manifest cache: ' + e.message);
		}
	}
	
	/**
	 * Clear manifest cache
	 */
	clearManifestCache() {
		this.manifestCache = {};
		this.saveManifestCache();
		Ti.API.info('[OTA CDN] Manifest cache cleared');
	}
	
	/**
	 * Check if CDN is healthy
	 */
	isCDNHealthy(url) {
		const health = this.cdnHealth[url];
		
		if (!health) {
			return true; // Unknown = assume healthy
		}
		
		if (health.status === 'healthy') {
			return true;
		}
		
		// Check if enough time has passed to retry
		const timeSinceFailure = Date.now() - health.lastFailure;
		const backoff = this.getCDNBackoff(url);
		
		return timeSinceFailure >= backoff;
	}
	
	/**
	 * Mark CDN as healthy
	 */
	markCDNHealthy(url) {
		this.cdnHealth[url] = {
			status: 'healthy',
			lastSuccess: Date.now(),
			consecutiveFailures: 0
		};
		
		Ti.API.debug('[OTA CDN] Marked healthy: ' + url);
	}
	
	/**
	 * Mark CDN as unhealthy
	 */
	markCDNUnhealthy(url) {
		const health = this.cdnHealth[url] || { consecutiveFailures: 0 };
		
		this.cdnHealth[url] = {
			status: 'unhealthy',
			lastFailure: Date.now(),
			consecutiveFailures: health.consecutiveFailures + 1
		};
		
		Ti.API.warn('[OTA CDN] Marked unhealthy (failures: ' + 
			this.cdnHealth[url].consecutiveFailures + '): ' + url);
	}
	
	/**
	 * Get exponential backoff for CDN
	 */
	getCDNBackoff(url) {
		const health = this.cdnHealth[url];
		
		if (!health || health.consecutiveFailures === 0) {
			return 0;
		}
		
		// Exponential backoff: 1s, 2s, 4s, 8s, ..., max 60s
		const backoff = Math.min(
			this.config.initialBackoff * Math.pow(2, health.consecutiveFailures - 1),
			this.config.maxBackoff
		);
		
		return backoff;
	}
	
	/**
	 * Get CDN health status
	 */
	getCDNHealth() {
		return { ...this.cdnHealth };
	}
	
	/**
	 * Reset CDN health (for testing)
	 */
	resetCDNHealth() {
		this.cdnHealth = {};
		Ti.API.info('[OTA CDN] CDN health reset');
	}
}

/**
 * Create CDN manager instance
 */
function createCDNManager(config) {
	return new CDNManager(config);
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	CDNManager,
	createCDNManager,
	DEFAULT_CONFIG
};

