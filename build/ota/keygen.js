#!/usr/bin/env node

/**
 * Titanium OTA - Ed25519 Key Generator
 *
 * Generates Ed25519 key pairs for OTA bundle signing
 */

'use strict';

const fs = require('fs');
const path = require('path');

try {
	const nacl = require('tweetnacl');

	console.log('==============================================');
	console.log('Titanium OTA - Ed25519 Key Generator');
	console.log('==============================================');
	console.log('');

	// Generate key pair
	const keyPair = nacl.sign.keyPair();

	const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex');
	const secretKeyHex = Buffer.from(keyPair.secretKey).toString('hex');

	console.log('Public Key (use in app config):');
	console.log(publicKeyHex);
	console.log('');

	console.log('Secret Key (use for signing bundles):');
	console.log(secretKeyHex);
	console.log('');

	// Save to files
	const args = process.argv.slice(2);
	const saveFiles = args.includes('--save');
	const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : './keys';
	const keyName = args.includes('--name') ? args[args.indexOf('--name') + 1] : 'default';

	if (saveFiles) {
		// Create output directory
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Save public key
		const publicKeyPath = path.join(outputDir, keyName + '.public.key');
		fs.writeFileSync(publicKeyPath, publicKeyHex, 'utf8');
		console.log('✓ Public key saved to: ' + publicKeyPath);

		// Save secret key
		const secretKeyPath = path.join(outputDir, keyName + '.secret.key');
		fs.writeFileSync(secretKeyPath, secretKeyHex, 'utf8');
		console.log('✓ Secret key saved to: ' + secretKeyPath);

		// Save config template
		const configPath = path.join(outputDir, keyName + '.config.json');
		const config = {
			publicKeys: {
				[keyName]: publicKeyHex
			}
		};
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
		console.log('✓ Config template saved to: ' + configPath);

		console.log('');
		console.log('⚠️  WARNING: Keep secret key file secure!');
		console.log('⚠️  Add to .gitignore: ' + path.basename(secretKeyPath));
	} else {
		console.log('To save keys to files, run:');
		console.log('  node keygen.js --save [--output ./keys] [--name production]');
	}

	console.log('');
	console.log('==============================================');

} catch (error) {
	if (error.code === 'MODULE_NOT_FOUND') {
		console.error('Error: tweetnacl not installed');
		console.error('');
		console.error('Install it with:');
		console.error('  npm install tweetnacl');
	} else {
		console.error('Error:', error.message);
	}
	process.exit(1);
}

