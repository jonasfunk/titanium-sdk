/**
 * Titanium OTA - Downloader Module
 * 
 * Handles:
 * - HTTPS download with progress tracking
 * - Retry logic with exponential backoff
 * - Multiple CDN failover
 * - Download caching
 */

'use strict';

// Default configuration
const DEFAULT_CONFIG = {
	maxRetries: 3,
	initialBackoff: 1000,      // 1 second
	maxBackoff: 30000,         // 30 seconds
	backoffMultiplier: 2,
	timeout: 60000,            // 60 seconds
	enableCache: true,
	cacheDir: Ti.Filesystem.applicationDataDirectory + '/ota_cache'
};

/**
 * Download file from URL with retry and failover
 * 
 * @param {Object} options
 * @param {String|Array} options.url - Single URL or array of URLs (for failover)
 * @param {String} options.destinationPath - Where to save the file
 * @param {Function} options.onProgress - Progress callback (bytesReceived, totalBytes)
 * @param {Function} options.onSuccess - Success callback (filePath)
 * @param {Function} options.onError - Error callback (error)
 * @param {Object} options.config - Configuration overrides
 */
function downloadFile(options) {
	const {
		url,
		destinationPath,
		onProgress,
		onSuccess,
		onError,
		config = {}
	} = options;
	
	// Merge config
	const finalConfig = Object.assign({}, DEFAULT_CONFIG, config);
	
	// Convert single URL to array
	const urls = Array.isArray(url) ? url : [url];
	
	Ti.API.info('[OTA Download] Starting download...');
	Ti.API.info('[OTA Download] URLs: ' + urls.length);
	Ti.API.info('[OTA Download] Destination: ' + destinationPath);
	
	// Try each URL in order
	downloadWithFailover(
		urls,
		0,
		destinationPath,
		finalConfig,
		onProgress,
		onSuccess,
		onError
	);
}

/**
 * Download with failover support
 */
function downloadWithFailover(urls, urlIndex, destinationPath, config, onProgress, onSuccess, onError) {
	if (urlIndex >= urls.length) {
		const error = new Error('All download URLs failed');
		Ti.API.error('[OTA Download] ' + error.message);
		if (onError) onError(error);
		return;
	}
	
	const currentUrl = urls[urlIndex];
	
	Ti.API.info('[OTA Download] Trying URL [' + (urlIndex + 1) + '/' + urls.length + ']: ' + currentUrl);
	
	// Download with retry
	downloadWithRetry(
		currentUrl,
		destinationPath,
		config,
		onProgress,
		function onUrlSuccess(filePath) {
			Ti.API.info('[OTA Download] ✓ Download successful from URL: ' + currentUrl);
			if (onSuccess) onSuccess(filePath);
		},
		function onUrlError(error) {
			Ti.API.warn('[OTA Download] URL failed: ' + currentUrl);
			Ti.API.warn('[OTA Download] Error: ' + error.message);
			
			// Try next URL
			downloadWithFailover(
				urls,
				urlIndex + 1,
				destinationPath,
				config,
				onProgress,
				onSuccess,
				onError
			);
		}
	);
}

/**
 * Download with retry logic
 */
function downloadWithRetry(url, destinationPath, config, onProgress, onSuccess, onError, attemptCount = 0) {
	if (attemptCount >= config.maxRetries) {
		const error = new Error('Max retries exceeded for URL: ' + url);
		if (onError) onError(error);
		return;
	}
	
	if (attemptCount > 0) {
		const backoff = Math.min(
			config.initialBackoff * Math.pow(config.backoffMultiplier, attemptCount - 1),
			config.maxBackoff
		);
		
		Ti.API.info('[OTA Download] Retrying in ' + backoff + 'ms (attempt ' + (attemptCount + 1) + ')...');
		
		setTimeout(function() {
			performDownload(url, destinationPath, config, onProgress, onSuccess, function(error) {
				downloadWithRetry(url, destinationPath, config, onProgress, onSuccess, onError, attemptCount + 1);
			});
		}, backoff);
		
	} else {
		performDownload(url, destinationPath, config, onProgress, onSuccess, function(error) {
			downloadWithRetry(url, destinationPath, config, onProgress, onSuccess, onError, attemptCount + 1);
		});
	}
}

/**
 * Perform actual download
 */
function performDownload(url, destinationPath, config, onProgress, onSuccess, onError) {
	try {
		Ti.API.debug('[OTA Download] Creating HTTP client...');
		
		// Create HTTP client
		const client = Ti.Network.createHTTPClient({
			timeout: config.timeout,
			
			onload: function(e) {
				try {
					Ti.API.info('[OTA Download] Download completed');
					
					// Save to file
					const file = Ti.Filesystem.getFile(destinationPath);
					file.write(this.responseData);
					
					Ti.API.info('[OTA Download] File saved: ' + destinationPath);
					Ti.API.info('[OTA Download] Size: ' + file.size + ' bytes');
					
					if (onSuccess) {
						onSuccess(destinationPath);
					}
					
				} catch (err) {
					Ti.API.error('[OTA Download] Error saving file: ' + err.message);
					if (onError) onError(err);
				}
			},
			
			onerror: function(e) {
				const error = new Error('Download failed: ' + (e.error || 'Unknown error'));
				Ti.API.error('[OTA Download] ' + error.message);
				
				if (onError) {
					onError(error);
				}
			},
			
			ondatastream: function(e) {
				if (onProgress) {
					onProgress(e.progress, 1.0);
				}
				
				if (e.progress % 0.1 < 0.01) { // Log every 10%
					Ti.API.debug('[OTA Download] Progress: ' + Math.round(e.progress * 100) + '%');
				}
			}
		});
		
		// Open and send
		Ti.API.debug('[OTA Download] Sending request to: ' + url);
		client.open('GET', url);
		client.send();
		
	} catch (e) {
		Ti.API.error('[OTA Download] Download setup error: ' + e.message);
		if (onError) onError(e);
	}
}

/**
 * Download manifest from URL
 * 
 * @param {String|Array} url - Manifest URL(s)
 * @param {Function} onSuccess - Success callback (manifest object)
 * @param {Function} onError - Error callback (error)
 * @param {Object} config - Configuration overrides
 */
function downloadManifest(url, onSuccess, onError, config) {
	const tempPath = Ti.Filesystem.applicationDataDirectory + '/ota_temp_manifest.json';
	
	downloadFile({
		url: url,
		destinationPath: tempPath,
		onSuccess: function(filePath) {
			try {
				// Read and parse manifest
				const file = Ti.Filesystem.getFile(filePath);
				const content = file.read().text;
				const manifest = JSON.parse(content);
				
				Ti.API.info('[OTA Download] Manifest downloaded and parsed');
				
				// Clean up temp file
				file.deleteFile();
				
				if (onSuccess) {
					onSuccess(manifest);
				}
				
			} catch (e) {
				Ti.API.error('[OTA Download] Manifest parse error: ' + e.message);
				if (onError) onError(e);
			}
		},
		onError: onError,
		config: config
	});
}

/**
 * Download bundle (zip file)
 * 
 * @param {String|Array} url - Bundle URL(s)
 * @param {String} version - Version identifier
 * @param {Function} onProgress - Progress callback
 * @param {Function} onSuccess - Success callback (filePath)
 * @param {Function} onError - Error callback
 * @param {Object} config - Configuration overrides
 */
function downloadBundle(url, version, onProgress, onSuccess, onError, config) {
	const bundlePath = (config && config.cacheDir || DEFAULT_CONFIG.cacheDir) + '/' + version + '.zip';
	
	// Create cache directory if needed
	const cacheDir = Ti.Filesystem.getFile(config && config.cacheDir || DEFAULT_CONFIG.cacheDir);
	if (!cacheDir.exists()) {
		cacheDir.createDirectory();
	}
	
	Ti.API.info('[OTA Download] Downloading bundle: ' + version);
	
	downloadFile({
		url: url,
		destinationPath: bundlePath,
		onProgress: onProgress,
		onSuccess: function(filePath) {
			Ti.API.info('[OTA Download] Bundle downloaded: ' + version);
			if (onSuccess) onSuccess(filePath);
		},
		onError: onError,
		config: config
	});
}

/**
 * Check if bundle is already cached
 * 
 * @param {String} version - Version identifier
 * @param {String} expectedHash - Expected SHA-256 hash
 * @returns {String|null} Path to cached bundle or null
 */
function checkCache(version, expectedHash, cacheDir) {
	try {
		const cachePath = (cacheDir || DEFAULT_CONFIG.cacheDir) + '/' + version + '.zip';
		const file = Ti.Filesystem.getFile(cachePath);
		
		if (!file.exists()) {
			Ti.API.debug('[OTA Download] Cache miss: ' + version);
			return null;
		}
		
		Ti.API.info('[OTA Download] Cache hit: ' + version);
		
		// TODO: Verify hash of cached file
		// For now, just return path
		
		return cachePath;
		
	} catch (e) {
		Ti.API.warn('[OTA Download] Cache check error: ' + e.message);
		return null;
	}
}

/**
 * Clear download cache
 */
function clearCache(cacheDir) {
	try {
		const dir = Ti.Filesystem.getFile(cacheDir || DEFAULT_CONFIG.cacheDir);
		
		if (dir.exists()) {
			const files = dir.getDirectoryListing();
			files.forEach(function(filename) {
				const file = Ti.Filesystem.getFile(dir.nativePath, filename);
				file.deleteFile();
				Ti.API.info('[OTA Download] Deleted cache file: ' + filename);
			});
		}
		
		Ti.API.info('[OTA Download] Cache cleared');
		return true;
		
	} catch (e) {
		Ti.API.error('[OTA Download] Cache clear error: ' + e.message);
		return false;
	}
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	downloadFile,
	downloadManifest,
	downloadBundle,
	checkCache,
	clearCache,
	DEFAULT_CONFIG
};

