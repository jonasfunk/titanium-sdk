/**
 * Titanium OTA Build Hook
 *
 * Automatically copies OTA modules to Resources/ota/ when OTA is enabled in tiapp.xml
 *
 * Enable OTA in tiapp.xml:
 * <property name="ti.ota.enabled" type="bool">true</property>
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');

exports.cliVersion = '>=3.2';
exports.id = 'ti.ota';
exports.init = init;

function init(logger, config, cli, _appc) {
	cli.on('build.pre.compile', {
		priority: 1000,
		post: function (builder, callback) {
			handleOTASetup(logger, builder, callback);
		}
	});
}

function handleOTASetup(logger, builder, callback) {
	try {
		const tiapp = builder.tiapp;

		// Check if OTA is enabled in tiapp.xml
		const otaEnabled = tiapp.properties
			&& tiapp.properties['ti.ota.enabled']
			&& tiapp.properties['ti.ota.enabled'].value === 'true';

		if (!otaEnabled) {
			logger.trace('[OTA] OTA not enabled in tiapp.xml - skipping');
			return callback();
		}

		logger.info('[OTA] OTA enabled - copying OTA modules to Resources/ota/');

		// Paths
		const sdkPath = builder.sdk.path;
		const projectDir = builder.projectDir;
		const sourceDir = path.join(sdkPath, 'templates', 'app', 'ota');
		const targetDir = path.join(projectDir, 'Resources', 'ota');

		// Verify source directory exists
		if (!fs.existsSync(sourceDir)) {
			logger.error('[OTA] Source directory not found: ' + sourceDir);
			logger.error('[OTA] Please ensure Titanium SDK includes OTA templates');
			return callback();
		}

		// Create target directory if it doesn't exist
		if (!fs.existsSync(targetDir)) {
			fs.mkdirpSync(targetDir);
			logger.debug('[OTA] Created directory: ' + targetDir);
		}

		// List of OTA module files to copy
		const otaModules = [
			'boot.js',
			'state.js',
			'runtime.js',
			'crypto.js',
			'verify.js',
			'downloader.js',
			'installer.js',
			'metrics.js',
			'cdn.js',
			'README.md'
		];

		// Copy each module
		let copiedCount = 0;
		otaModules.forEach(function (filename) {
			const sourcePath = path.join(sourceDir, filename);
			const targetPath = path.join(targetDir, filename);

			if (!fs.existsSync(sourcePath)) {
				logger.warn('[OTA] Module not found, skipping: ' + filename);
				return;
			}

			// Check if file already exists and is up to date
			if (fs.existsSync(targetPath)) {
				const sourceStats = fs.statSync(sourcePath);
				const targetStats = fs.statSync(targetPath);

				// Compare file sizes and modification times
				if (sourceStats.size === targetStats.size
					&& sourceStats.mtime <= targetStats.mtime) {
					logger.trace('[OTA] Already up to date: ' + filename);
					copiedCount++;
					return;
				}
			}

			// Copy file
			try {
				fs.copyFileSync(sourcePath, targetPath);
				logger.debug('[OTA] Copied: ' + filename);
				copiedCount++;
			} catch (err) {
				logger.error('[OTA] Failed to copy ' + filename + ': ' + err.message);
			}
		});

		logger.info('[OTA] ✓ OTA modules ready (' + copiedCount + '/' + otaModules.length + ' files)');

		// Check for optional OTA config
		const configPath = path.join(projectDir, 'Resources', 'ota.config.json');
		if (fs.existsSync(configPath)) {
			logger.info('[OTA] Using OTA config: ota.config.json');
		} else {
			logger.debug('[OTA] No ota.config.json found (will use programmatic config)');
		}

		// Log configuration properties
		const manifestUrl = tiapp.properties && tiapp.properties['ti.ota.manifestUrl'];
		if (manifestUrl && manifestUrl.value) {
			logger.info('[OTA] Manifest URL: ' + manifestUrl.value);
		}

		const channel = tiapp.properties && tiapp.properties['ti.ota.channel'];
		if (channel && channel.value) {
			logger.info('[OTA] Channel: ' + channel.value);
		}

		callback();

	} catch (error) {
		logger.error('[OTA] Error in OTA build hook: ' + error.message);
		logger.error(error.stack);
		callback();
	}
}
