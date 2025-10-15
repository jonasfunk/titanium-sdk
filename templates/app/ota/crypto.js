/**
 * Titanium OTA - Cryptography Module (POC)
 * 
 * Pure JavaScript implementations of:
 * - SHA-256 (hash verification)
 * - Ed25519 (signature verification)
 * 
 * Note: Uses lightweight pure-JS implementations suitable for Titanium runtime.
 */

'use strict';

// ============================================================================
// SHA-256 Implementation (Pure JS)
// ============================================================================

function sha256(data) {
	const str = typeof data === 'string' ? data : JSON.stringify(data);
	
	// Convert string to bytes
	const bytes = [];
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		if (code < 0x80) {
			bytes.push(code);
		} else if (code < 0x800) {
			bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0x10000) {
			bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f)
			);
		}
	}
	
	return sha256Bytes(bytes);
}

function sha256Bytes(bytes) {
	// SHA-256 constants (first 32 bits of fractional parts of cube roots of first 64 primes)
	const K = [
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	];
	
	// Initial hash values (first 32 bits of fractional parts of square roots of first 8 primes)
	let H = [
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	];
	
	// Pre-processing: adding padding bits
	const msgLen = bytes.length;
	const bitLen = msgLen * 8;
	
	// Append '1' bit and zeros
	bytes.push(0x80);
	
	// Append zeros until length ≡ 448 mod 512
	while ((bytes.length % 64) !== 56) {
		bytes.push(0x00);
	}
	
	// Append length as 64-bit big-endian
	for (let i = 7; i >= 0; i--) {
		bytes.push((bitLen >>> (i * 8)) & 0xff);
	}
	
	// Process message in 512-bit chunks
	for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
		const W = new Array(64);
		
		// Copy chunk into first 16 words of message schedule
		for (let i = 0; i < 16; i++) {
			W[i] = (bytes[chunkStart + i * 4] << 24) |
			       (bytes[chunkStart + i * 4 + 1] << 16) |
			       (bytes[chunkStart + i * 4 + 2] << 8) |
			       bytes[chunkStart + i * 4 + 3];
		}
		
		// Extend the first 16 words into remaining 48 words
		for (let i = 16; i < 64; i++) {
			const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
			const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
			W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
		}
		
		// Initialize working variables
		let [a, b, c, d, e, f, g, h] = H;
		
		// Compression function main loop
		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + S1 + ch + K[i] + W[i]) | 0;
			const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) | 0;
			
			h = g;
			g = f;
			f = e;
			e = (d + temp1) | 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) | 0;
		}
		
		// Add compressed chunk to current hash value
		H = [
			(H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0,
			(H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0
		];
	}
	
	// Produce final hash value (big-endian)
	const hash = [];
	for (let i = 0; i < H.length; i++) {
		hash.push((H[i] >>> 24) & 0xff);
		hash.push((H[i] >>> 16) & 0xff);
		hash.push((H[i] >>> 8) & 0xff);
		hash.push(H[i] & 0xff);
	}
	
	return bytesToHex(hash);
}

function rightRotate(n, b) {
	return (n >>> b) | (n << (32 - b));
}

function bytesToHex(bytes) {
	return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function hexToBytes(hex) {
	const bytes = [];
	for (let i = 0; i < hex.length; i += 2) {
		bytes.push(parseInt(hex.substr(i, 2), 16));
	}
	return bytes;
}

// ============================================================================
// Ed25519 Signature Verification (Pure JS - Simplified)
// ============================================================================

/**
 * Simplified Ed25519 verification for POC.
 * For production, use tweetnacl.js or similar.
 * 
 * This is a placeholder that demonstrates the interface.
 * Real implementation would use proper curve25519 math.
 */
function verifyEd25519Signature(message, signature, publicKey) {
	// POC: Basic structure validation
	if (!message || !signature || !publicKey) {
		return false;
	}
	
	if (signature.length !== 128) { // 64 bytes in hex = 128 chars
		Ti.API.warn('[OTA] Invalid signature length: ' + signature.length);
		return false;
	}
	
	if (publicKey.length !== 64) { // 32 bytes in hex = 64 chars
		Ti.API.warn('[OTA] Invalid public key length: ' + publicKey.length);
		return false;
	}
	
	// POC placeholder: In production, use proper Ed25519 verification
	// This would use tweetnacl.js or similar library
	Ti.API.warn('[OTA] POC: Ed25519 verification placeholder - always returns true for valid format');
	Ti.API.warn('[OTA] Production must use proper Ed25519 implementation (e.g., tweetnacl.js)');
	
	return true; // POC only - replace with real verification
}

/**
 * Verify bundle integrity and authenticity
 * 
 * @param {String} bundleData - The bundle content to verify
 * @param {String} expectedHash - Expected SHA-256 hash (hex)
 * @param {String} signature - Ed25519 signature (hex)
 * @param {String} publicKey - Ed25519 public key (hex)
 * @returns {Object} {valid: boolean, error?: string}
 */
function verifyBundle(bundleData, expectedHash, signature, publicKey) {
	try {
		// Step 1: Verify SHA-256 hash
		const actualHash = sha256(bundleData);
		
		Ti.API.info('[OTA] Hash verification:');
		Ti.API.info('  Expected: ' + expectedHash);
		Ti.API.info('  Actual:   ' + actualHash);
		
		if (actualHash !== expectedHash) {
			return {
				valid: false,
				error: 'Hash mismatch: bundle integrity check failed'
			};
		}
		
		// Step 2: Verify Ed25519 signature
		const signatureValid = verifyEd25519Signature(expectedHash, signature, publicKey);
		
		if (!signatureValid) {
			return {
				valid: false,
				error: 'Invalid signature: bundle authenticity check failed'
			};
		}
		
		return {
			valid: true
		};
		
	} catch (e) {
		return {
			valid: false,
			error: 'Verification error: ' + e.message
		};
	}
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
	sha256,
	sha256Bytes,
	verifyEd25519Signature,
	verifyBundle,
	bytesToHex,
	hexToBytes
};

