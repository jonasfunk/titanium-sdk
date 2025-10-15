**# Titanium OTA (Over-The-Air) Update System

Complete documentation for the Titanium SDK OTA update system.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [Building Bundles](#building-bundles)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Advanced Topics](#advanced-topics)
11. [Troubleshooting](#troubleshooting)
12. [API Reference](#api-reference)

## Overview

The Titanium OTA system enables secure, over-the-air updates of JavaScript code and assets without requiring App Store/Play Store releases.

### Features

- ✅ **Secure Updates**: SHA-256 hash + Ed25519 signature verification
- ✅ **Automatic Rollback**: Crashes trigger automatic rollback to previous version
- ✅ **CDN Failover**: Multiple CDN support with automatic failover
- ✅ **Staged Rollout**: Gradual rollout with percentage control
- ✅ **Metrics Tracking**: Built-in analytics and monitoring
- ✅ **Offline Support**: Cached manifests and bundles
- ✅ **TypeScript Support**: Full TypeScript workflow
- ✅ **Asset Management**: Dynamic asset resolution

### Limitations

⚠️ **OTA can ONLY update:**
- JavaScript code
- Images and assets
- JSON data files

⚠️ **OTA CANNOT update:**
- Native modules
- App permissions (tiapp.xml)
- Native code (Objective-C, Java, Swift)
- SDK version

## Quick Start

### 1. Enable OTA in tiapp.xml

Add this to your `tiapp.xml`:

```xml
<property name="ti.ota.enabled" type="bool">true</property>
<property name="ti.ota.manifestUrl" type="string">https://cdn.example.com/manifest.json</property>
<property name="ti.ota.channel" type="string">production</property>
<property name="ti.ota.publicKey.main" type="string">your-ed25519-public-key-hex</property>
```

See [tiapp.xml Configuration Guide](./TIAPP_CONFIG.md) for complete reference.

### 2. Initialize OTA in Your App

```javascript
// Resources/app.js
const OTA = require('ota/boot');

OTA.initialize({
  manifestUrl: 'https://cdn.example.com/manifest.json',
  channel: 'production',
  publicKeys: {
    main: 'your-ed25519-public-key-here'
  }
}, function onReady(runtime) {
  // OTA system ready, start your app
  runtime.start();
  
  // Your app code here
  const win = Ti.UI.createWindow({
    backgroundColor: '#fff',
    title: 'My App - v' + runtime.version
  });
  
  win.addEventListener('postlayout', function() {
    // Mark bundle as healthy after successful UI render
    runtime.markHealthy();
  });
  
  win.open();
  
}, function onError(error) {
  Ti.API.error('OTA failed: ' + error.message);
  // Handle error - maybe show alert
});
```

**Note:** OTA modules are automatically copied to `Resources/ota/` during build when `ti.ota.enabled` is `true`.

### 3. Build and Deploy Bundle

```bash
# Package bundle
node build/ota/packager.js \
  --version 1.0.1 \
  --channel production \
  --key-file private.key

# Upload to CDN (manual or via script)
# Upload dist/ota/1.0.1/* to your CDN
```

### 4. Users Get Update

- Next app launch checks for updates
- Downloads and verifies new bundle
- Installs atomically
- Activates on next restart

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       App Launch                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   boot.js (Initialize)                       │
│  1. Record launch                                            │
│  2. Check rollback condition                                 │
│  3. Load active bundle or fallback                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│   state.js       │          │  runtime.js      │
│  - Version track │          │  - Eval bundle   │
│  - Crash counter │          │  - Asset resolve │
│  - Healthy mark  │          │  - Require sys   │
└────────┬─────────┘          └──────────────────┘
         │
         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  downloader.js   │    │  verify.js       │    │  installer.js    │
│  - HTTPS         │    │  - SHA-256       │    │  - Unzip         │
│  - Retry/backoff │    │  - Ed25519       │    │  - Atomic switch │
│  - Failover      │    │  - Keyring       │    │  - Cleanup       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │    metrics.js    │
                        │  - Event track   │
                        │  - Analytics     │
                        └──────────────────┘
```

## Installation

### Prerequisites

- Titanium SDK 12.0.0+ (with OTA support)
- Node.js 16+ (for build tools)
- npm or yarn

### Enable OTA in Your Project

**Recommended:** Enable OTA in tiapp.xml (automatic):

```xml
<property name="ti.ota.enabled" type="bool">true</property>
```

The build hook will automatically copy OTA modules to `Resources/ota/` during compilation.

**Alternative:** Manual installation:

```bash
# Copy OTA templates to your project
cp -r $TITANIUM_SDK/templates/app/ota Resources/
```

Files copied to `Resources/ota/`:
- `boot.js` - Main entry point
- `state.js` - State management
- `runtime.js` - Bundle execution
- `crypto.js` - SHA-256 & Ed25519
- `verify.js` - Verification logic
- `downloader.js` - HTTPS download
- `installer.js` - Installation
- `metrics.js` - Analytics
- `cdn.js` - CDN failover

### Install Build Tools

```bash
# Install packager dependencies
cd $TITANIUM_SDK/build/ota
npm install tweetnacl
```

## Configuration

Configuration can be done in two ways:

1. **tiapp.xml** - Enable OTA and set default values (recommended)
2. **Programmatic** - Override or supplement tiapp.xml settings in code

See guides:
- [tiapp.xml Configuration](./TIAPP_CONFIG.md) - Enable OTA and configure in tiapp.xml
- [Programmatic Configuration](./CONFIG.md) - Complete runtime configuration guide

### Basic Config (tiapp.xml)

```javascript
{
  manifestUrl: 'https://cdn.example.com/manifest.json',
  channel: 'production',
  publicKeys: {
    main: 'ed25519-public-key-hex'
  }
}
```

### Production Config

```javascript
{
  manifestUrls: [
    'https://cdn1.example.com/manifest.json',
    'https://cdn2.example.com/manifest.json',
    'https://cdn3.example.com/manifest.json'
  ],
  channel: 'production',
  publicKeys: {
    'main': 'primary-key',
    'backup': 'backup-key'
  },
  download: {
    maxRetries: 5,
    timeout: 120000
  },
  metrics: {
    enabled: true,
    endpoint: 'https://metrics.example.com/ota'
  }
}
```

## Usage

### Check for Updates

```javascript
const OTA = require('ota/boot');

// Manual update check
function checkForUpdates() {
  const CDN = require('ota/cdn');
  const cdn = CDN.createCDNManager({
    manifestUrls: ['https://cdn.example.com/manifest.json']
  });
  
  cdn.fetchManifest(['https://cdn.example.com/manifest.json'])
    .then(manifest => {
      const currentVersion = OTA.getState().activeVersion || '0.0.0';
      
      if (manifest.version !== currentVersion) {
        Ti.API.info('Update available: ' + manifest.version);
        downloadAndInstall(manifest);
      } else {
        Ti.API.info('Already on latest version');
      }
    })
    .catch(error => {
      Ti.API.error('Update check failed: ' + error.message);
    });
}
```

### Download and Install

```javascript
function downloadAndInstall(manifest) {
  const Downloader = require('ota/downloader');
  const Installer = require('ota/installer');
  const Verify = require('ota/verify');
  
  // Step 1: Download
  Downloader.downloadBundle(
    manifest.bundle.url,
    manifest.version,
    function onProgress(progress) {
      Ti.API.info('Download: ' + Math.round(progress * 100) + '%');
    },
    function onSuccess(bundlePath) {
      Ti.API.info('Download complete');
      
      // Step 2: Verify
      const bundleFile = Ti.Filesystem.getFile(bundlePath);
      const bundleData = bundleFile.read().text;
      
      const verification = Verify.verifyBundle({
        bundleData: bundleData,
        expectedHash: manifest.hash,
        signature: manifest.signature,
        publicKey: config.publicKeys[manifest.keyId]
      });
      
      if (!verification.valid) {
        Ti.API.error('Verification failed: ' + verification.error);
        return;
      }
      
      Ti.API.info('Verification passed');
      
      // Step 3: Install
      Installer.installBundle({
        zipPath: bundlePath,
        version: manifest.version,
        manifest: manifest,
        onSuccess: function() {
          Ti.API.info('Installation complete. Restart to activate.');
          showRestartPrompt();
        },
        onError: function(error) {
          Ti.API.error('Installation failed: ' + error.message);
        }
      });
    },
    function onError(error) {
      Ti.API.error('Download failed: ' + error.message);
    }
  );
}
```

### Mark Healthy

Always mark your bundle as healthy after successful app initialization:

```javascript
win.addEventListener('postlayout', function() {
  OTA.markHealthy();
});
```

Or manually:

```javascript
setTimeout(function() {
  if (appInitializedSuccessfully) {
    runtime.markHealthy();
  }
}, 5000);
```

## Building Bundles

See [Build Guide](./BUILD.md) for complete build documentation.

### Simple Build

```bash
node build/ota/packager.js \
  --version 1.2.3 \
  --channel production \
  --key-file keys/production.key
```

### TypeScript Workflow

```javascript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "commonjs",
    "outDir": "./build",
    "rootDir": "./src"
  }
}
```

```bash
# Build workflow
npx tsc                    # TypeScript → CommonJS
node build/ota/packager.js # Bundle → Sign → Package
```

### With Custom Config

```javascript
// ota-build.config.json
{
  "sourceDir": "./src",
  "buildDir": "./build",
  "outputDir": "./dist/ota",
  "version": "1.2.3",
  "channel": "production",
  "privateKeyFile": "./keys/production.key",
  "upload": true,
  "uploadCommand": "aws s3 sync {{package}} s3://my-cdn/{{version}}/"
}
```

```bash
node build/ota/packager.js --config ota-build.config.json
```

## Deployment

### Staged Rollout

Start with 5%, monitor, then increase:

```json
// manifest.json - Day 1 (5%)
{
  "version": "2.0.0",
  "rollout": {
    "channel": "production",
    "percentage": 5
  }
}

// manifest.json - Day 3 (25%)
{
  "version": "2.0.0",
  "rollout": {
    "percentage": 25
  }
}

// manifest.json - Day 7 (100%)
{
  "version": "2.0.0",
  "rollout": {
    "percentage": 100
  }
}
```

### Kill Switch

Set percentage to 0 to stop rollout:

```json
{
  "version": "2.0.0",
  "rollout": {
    "percentage": 0
  },
  "deprecation": {
    "deprecated": true,
    "deprecationDate": "2024-01-15T00:00:00Z"
  }
}
```

### CDN Setup

Recommended CDN structure:

```
cdn.example.com/
├── manifest.json                  # Latest manifest
├── manifests/
│   ├── 1.0.0.json
│   ├── 1.0.1.json
│   └── 2.0.0.json
└── bundles/
    ├── 1.0.0/
    │   ├── bundle.zip
    │   └── manifest.json
    ├── 1.0.1/
    │   ├── bundle.zip
    │   └── manifest.json
    └── 2.0.0/
        ├── bundle.zip
        └── manifest.json
```

## Security

See [SECURITY.md](./SECURITY.md) for complete security guide.

### Key Generation

```javascript
const nacl = require('tweetnacl');

const keyPair = nacl.sign.keyPair();

console.log('Public Key:', Buffer.from(keyPair.publicKey).toString('hex'));
console.log('Secret Key:', Buffer.from(keyPair.secretKey).toString('hex'));
```

⚠️ **Never commit secret keys to version control!**

### Best Practices

1. ✅ **Always verify signatures** - Never skip signature check in production
2. ✅ **Use HTTPS only** - Never use HTTP for manifest or bundles
3. ✅ **Rotate keys quarterly** - Regular key rotation reduces risk
4. ✅ **Separate keys per environment** - dev, staging, prod keys
5. ✅ **Monitor metrics** - Track rollout health
6. ✅ **Start small** - 1-5% initial rollout
7. ✅ **Have kill switch ready** - Process to set percentage to 0
8. ✅ **Test rollback** - Regularly test rollback scenarios

## Advanced Topics

### Custom Asset Resolution

```javascript
OTA.initialize({
  // ... other config
  
  assetResolver: function(assetPath, bundleVersion) {
    return 'https://assets.example.com/' + bundleVersion + '/' + assetPath;
  }
}, onReady, onError);
```

### Metrics Integration

```javascript
const Metrics = require('ota/metrics');

const metrics = Metrics.createMetrics({
  enabled: true,
  endpoint: 'https://metrics.example.com/ota',
  events: ['download', 'install', 'activate', 'healthy', 'rollback', 'error']
});

// Track custom event
metrics.track('customEvent', {
  key: 'value'
});
```

### Alloy Support

For Alloy apps, see [ALLOY.md](./ALLOY.md) for integration guide.

## Troubleshooting

### Bundle Won't Load

1. Check console logs for errors
2. Verify bundle exists in `applicationDataDirectory/ota_bundles/`
3. Check state: `OTA.getState()`
4. Try reset: `OTA.resetState()`

### Rollback Loop

If app keeps rolling back:

1. Check crash count: `OTA.getState().crashCount`
2. Verify healthy mark is called: `runtime.markHealthy()`
3. Check for early crashes before healthy mark
4. Review bundle code for errors

### Download Fails

1. Check network connectivity
2. Verify manifest URL is accessible
3. Check CDN health: `cdn.getCDNHealth()`
4. Try different CDN: Use multiple manifestUrls

### Signature Verification Fails

1. Verify public key matches private key used to sign
2. Check manifest signature format (128 hex chars)
3. Ensure hash format is correct (64 hex chars)
4. Test with skipSignatureCheck: true (debug only!)

## API Reference

### OTA.initialize(config, onReady, onError)

Initialize OTA system.

**Parameters:**
- `config` (Object): Configuration object
- `onReady` (Function): Callback with runtime object
- `onError` (Function): Error callback

**Returns:** void

### runtime.start()

Start application runtime.

### runtime.markHealthy()

Mark current bundle as healthy.

**Returns:** Boolean - Success status

### runtime.getInfo()

Get runtime information.

**Returns:** Object with version, health status, etc.

### OTA.getState()

Get current OTA state.

**Returns:** Object with activeVersion, crashCount, etc.

### OTA.resetState()

Reset OTA state (for debugging).

**Returns:** Boolean - Success status

## Examples

See `tests/Resources/ota-demo/` for complete working examples.

## License

Same as Titanium SDK.

## Support

- Documentation: https://docs.appcelerator.com/
- Issues: https://github.com/tidev/titanium-sdk/issues
- Community: https://tidev.io/

---

**Happy Updating! 🚀**
