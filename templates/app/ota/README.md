# Titanium OTA System - POC

Over-the-Air (OTA) update system for Titanium SDK applications.

## Overview

This POC demonstrates the core OTA functionality:

1. **Bundle Evaluation**: Execute JavaScript bundles dynamically
2. **Cryptographic Verification**: SHA-256 hash + Ed25519 signature verification
3. **Healthy Mark & Rollback**: Automatic rollback on crashes

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      App Startup                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              boot.js (Initialize)                        │
│  - Record launch                                         │
│  - Check rollback condition                              │
│  - Load active bundle                                    │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  state.js        │    │  runtime.js      │
│  - Version track │    │  - Eval bundle   │
│  - Crash counter │    │  - Asset resolve │
│  - Healthy mark  │    │  - Require sys   │
└──────────────────┘    └──────────────────┘
         │
         ▼
┌──────────────────┐
│  crypto.js       │
│  - SHA-256       │
│  - Ed25519       │
└──────────────────┘
```

## Module Overview

### boot.js

Main entry point. Orchestrates:
- Launch recording
- Rollback detection
- Bundle loading and verification
- Runtime creation

**API:**
```javascript
const OTA = require('ota/boot');

OTA.initialize(config, onReady, onError);
OTA.markHealthy();
OTA.getState();
OTA.resetState();
OTA.installBundle(version, code, manifest); // For testing
```

### state.js

State management for versions and health:
- Tracks active, previous, and healthy versions
- Crash counter with auto-rollback threshold (3 crashes)
- Installation metadata

**Storage:** `applicationDataDirectory/ota_state.json`

### runtime.js

Bundle execution engine:
- Evaluates JavaScript bundles in Titanium context
- Asset URL resolution
- Minimal require() system (placeholder for micro-bundler)

### crypto.js

Security primitives:
- **SHA-256**: Pure JS implementation for hash verification
- **Ed25519**: Placeholder for signature verification (use tweetnacl.js in production)

⚠️ **POC Note**: Ed25519 verification is a placeholder. Production MUST use a proper implementation like `tweetnacl.js`.

## Usage Example

### Basic Integration

```javascript
// Resources/app.js
const OTA = require('ota/boot');

OTA.initialize({
  debugMode: true,
  skipSignatureCheck: true, // POC only
  bundleBasePath: Ti.Filesystem.applicationDataDirectory + '/ota_bundles',
  publicKeys: {
    main: '<ed25519-public-key-hex>'
  }
}, function onReady(runtime) {
  // Bundle loaded successfully
  runtime.start();
  
  // Your app code here
  const win = Ti.UI.createWindow({
    backgroundColor: '#fff',
    title: 'OTA Demo - v' + runtime.version
  });
  
  // Mark healthy after successful render
  win.addEventListener('postlayout', function() {
    runtime.markHealthy();
  });
  
  win.open();
  
}, function onError(err) {
  Ti.API.error('OTA failed: ' + err.message);
  // Handle error - maybe show alert or use embedded fallback
});
```

### Installing a Test Bundle

```javascript
// Test bundle code
const testBundle = `
  Ti.API.info('Hello from OTA bundle!');
  
  const win = Ti.UI.createWindow({
    backgroundColor: '#00ff00',
    title: 'OTA Bundle v1.0.0'
  });
  
  const label = Ti.UI.createLabel({
    text: 'This is from OTA bundle!',
    color: '#000',
    font: { fontSize: 20 }
  });
  
  win.add(label);
`;

// Manifest
const manifest = {
  version: '1.0.0',
  hash: 'sha256-hash-here',
  signature: 'ed25519-signature-here',
  keyId: 'main',
  timestamp: Date.now()
};

// Install
const result = OTA.installBundle('1.0.0', testBundle, manifest);

if (result.success) {
  Ti.API.info('Bundle installed. Restart app to activate.');
} else {
  Ti.API.error('Installation failed: ' + result.error);
}
```

## Testing the POC

### Test 1: Basic Bundle Evaluation

1. Create test bundle with simple JS code
2. Install using `installBundle()`
3. Restart app
4. Verify bundle executes

### Test 2: Healthy Mark

1. Install bundle
2. Restart app
3. Call `runtime.markHealthy()` after successful UI render
4. Verify state shows healthy version

### Test 3: Rollback on Crash

1. Install bundle with intentional crash (e.g., `throw new Error('crash')`)
2. Restart app 3 times
3. Verify automatic rollback to previous version

### Test 4: Hash Verification

1. Create bundle and compute SHA-256
2. Install with correct hash
3. Verify it loads
4. Try installing with wrong hash
5. Verify it's rejected

## File Structure

```
ota/
├── README.md          # This file
├── boot.js            # Main entry point
├── state.js           # State management
├── runtime.js         # Bundle execution
└── crypto.js          # Security primitives
```

## Configuration Options

```javascript
{
  debugMode: true,              // Enable debug logging
  skipSignatureCheck: false,    // Skip Ed25519 verification (dev only)
  bundleBasePath: 'path',       // Where bundles are stored
  publicKeys: {                 // Ed25519 public keys
    main: 'hex-key',
    backup: 'hex-key'
  }
}
```

## State File Format

```json
{
  "activeVersion": "1.0.0",
  "previousVersion": "0.9.0",
  "healthyVersion": "1.0.0",
  "crashCount": 0,
  "lastLaunchTime": 1234567890,
  "rollbackPending": false,
  "installations": {
    "1.0.0": {
      "installTime": 1234567890,
      "activatedTime": 1234567890,
      "healthyTime": 1234567890
    }
  }
}
```

## Next Steps (Phase 2+)

After POC validation:

1. **Real Ed25519**: Integrate `tweetnacl.js` or similar
2. **Downloader**: HTTPS download with retry/backoff
3. **Installer**: Unzip, atomic switch, disk quota
4. **Verify**: Complete verification workflow
5. **Micro-bundler**: Build tooling for production bundles
6. **Manifest**: Complete manifest schema with min SDK version, etc.

## Security Notes

⚠️ **POC Limitations:**
- Ed25519 verification is placeholder only
- `skipSignatureCheck` should NEVER be used in production
- Hash verification uses pure JS (slower but works)

✅ **Production Requirements:**
- Implement proper Ed25519 using `tweetnacl.js`
- Always verify signatures
- Use HTTPS with certificate pinning (optional)
- Implement key rotation strategy
- Add staged rollout (1-5% initially)

## Performance Notes

- Bundle size: Keep under 5MB for fast downloads
- Hash computation: O(n) with bundle size, acceptable for <5MB
- State I/O: Minimal, only on launch and healthy mark
- Eval overhead: Negligible for single bundle execution

## Debugging

Enable debug mode:
```javascript
OTA.initialize({ debugMode: true, ... });
```

Check state:
```javascript
const state = OTA.getState();
Ti.API.info(JSON.stringify(state, null, 2));
```

Reset state (testing):
```javascript
OTA.resetState();
```

## Known Issues

- Ed25519 is placeholder (not functional)
- No actual download/unzip yet (Phase 2)
- Asset resolution is basic (improve in Phase 2)
- No Alloy support yet (Phase 3)

## License

Same as Titanium SDK.

