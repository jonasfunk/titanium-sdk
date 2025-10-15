# OTA Configuration

## Overview

OTA configuration defines how the OTA system behaves in your app. Configuration can be provided programmatically or via a config file.

## Configuration File: ota.config.json

Place in `Resources/ota.config.json`:

```json
{
  "manifestUrl": "https://cdn.example.com/manifest.json",
  "manifestUrls": [
    "https://cdn1.example.com/manifest.json",
    "https://cdn2.example.com/manifest.json",
    "https://cdn3.example.com/manifest.json"
  ],
  
  "channel": "production",
  
  "publicKeys": {
    "main": "abc123...",
    "backup": "def456...",
    "prod-2024-q1": "ghi789..."
  },
  
  "download": {
    "maxRetries": 3,
    "timeout": 60000,
    "cacheEnabled": true
  },
  
  "installation": {
    "maxBundles": 2,
    "maxTotalSize": 52428800,
    "requireFreeSpace": 104857600
  },
  
  "rollback": {
    "maxCrashCount": 3,
    "autoRollback": true
  },
  
  "debug": {
    "enabled": false,
    "skipSignatureCheck": false,
    "localManifestUrl": null,
    "verboseLogging": false
  },
  
  "metrics": {
    "enabled": true,
    "endpoint": "https://metrics.example.com/ota",
    "events": ["check", "download", "install", "activate", "healthy", "rollback", "error"]
  }
}
```

## Configuration Fields

### manifestUrl / manifestUrls

- **manifestUrl**: Single manifest URL (string)
- **manifestUrls**: Array of manifest URLs for failover (array)
- At least one is required
- URLs should use HTTPS

### channel

- Release channel to use: "production", "beta", "alpha", etc.
- Default: "production"
- Must match manifest channel

### publicKeys

- Object mapping key IDs to Ed25519 public keys (hex, 64 chars)
- Required for signature verification
- Support multiple keys for rotation

Example:
```json
{
  "publicKeys": {
    "main": "1234567890abcdef...",
    "backup": "fedcba0987654321..."
  }
}
```

### download

Download configuration:

- **maxRetries**: Max retry attempts per URL (default: 3)
- **timeout**: HTTP timeout in milliseconds (default: 60000)
- **cacheEnabled**: Enable download caching (default: true)

### installation

Installation limits:

- **maxBundles**: Max bundles to keep (default: 2 - active + previous)
- **maxTotalSize**: Max total size in bytes (default: 50 MB)
- **requireFreeSpace**: Required free space in bytes (default: 100 MB)

### rollback

Rollback behavior:

- **maxCrashCount**: Crashes before auto-rollback (default: 3)
- **autoRollback**: Enable automatic rollback (default: true)

### debug

Debug options (development only):

- **enabled**: Enable debug mode (default: false)
- **skipSignatureCheck**: Skip Ed25519 verification (default: false) ⚠️ NEVER use in production
- **localManifestUrl**: Override manifest URL for local testing
- **verboseLogging**: Enable verbose logging (default: false)

### metrics

Metrics reporting:

- **enabled**: Enable metrics (default: true)
- **endpoint**: Metrics API endpoint
- **events**: Array of events to report

## Programmatic Configuration

### Basic Example

```javascript
const OTA = require('ota/boot');

OTA.initialize({
  manifestUrl: 'https://cdn.example.com/manifest.json',
  channel: 'production',
  publicKeys: {
    main: 'abc123...'
  }
}, onReady, onError);
```

### Full Example

```javascript
const OTA = require('ota/boot');

OTA.initialize({
  // Manifest
  manifestUrls: [
    'https://cdn1.example.com/manifest.json',
    'https://cdn2.example.com/manifest.json'
  ],
  channel: 'production',
  
  // Security
  publicKeys: {
    'main': '1234567890abcdef...',
    'backup': 'fedcba0987654321...'
  },
  
  // Download
  download: {
    maxRetries: 5,
    timeout: 120000
  },
  
  // Installation
  installation: {
    maxBundles: 3,
    maxTotalSize: 100 * 1024 * 1024 // 100 MB
  },
  
  // Rollback
  rollback: {
    maxCrashCount: 2,
    autoRollback: true
  },
  
  // Debug (development only)
  debug: {
    enabled: Ti.App.deployType === 'development',
    skipSignatureCheck: false,
    verboseLogging: true
  },
  
  // Metrics
  metrics: {
    enabled: true,
    endpoint: 'https://metrics.example.com/ota',
    events: ['check', 'download', 'install', 'activate', 'healthy', 'rollback', 'error']
  }
  
}, function onReady(runtime) {
  runtime.start();
  
}, function onError(error) {
  Ti.API.error('OTA failed: ' + error.message);
});
```

## Loading Config from File

```javascript
const OTA = require('ota/boot');

// Load config file
const configFile = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, 'ota.config.json');
const config = JSON.parse(configFile.read().text);

// Initialize with file config
OTA.initialize(config, onReady, onError);
```

## Environment-Specific Configuration

### Development

```json
{
  "manifestUrl": "http://localhost:3000/manifest.json",
  "channel": "development",
  "publicKeys": {
    "dev": "dev-key-here"
  },
  "debug": {
    "enabled": true,
    "skipSignatureCheck": true,
    "verboseLogging": true
  }
}
```

### Staging

```json
{
  "manifestUrl": "https://staging-cdn.example.com/manifest.json",
  "channel": "staging",
  "publicKeys": {
    "staging": "staging-key-here"
  },
  "debug": {
    "enabled": true,
    "skipSignatureCheck": false,
    "verboseLogging": true
  }
}
```

### Production

```json
{
  "manifestUrls": [
    "https://cdn1.example.com/manifest.json",
    "https://cdn2.example.com/manifest.json",
    "https://cdn3.example.com/manifest.json"
  ],
  "channel": "production",
  "publicKeys": {
    "main": "production-key-here",
    "backup": "backup-key-here"
  },
  "debug": {
    "enabled": false,
    "skipSignatureCheck": false,
    "verboseLogging": false
  },
  "metrics": {
    "enabled": true,
    "endpoint": "https://metrics.example.com/ota"
  }
}
```

## Public Key Management

### Key Generation

Generate Ed25519 key pair (Node.js):

```javascript
const nacl = require('tweetnacl');

const keyPair = nacl.sign.keyPair();

console.log('Public Key (hex):', Buffer.from(keyPair.publicKey).toString('hex'));
console.log('Secret Key (hex):', Buffer.from(keyPair.secretKey).toString('hex'));
```

### Key Rotation

1. Generate new key pair
2. Add new public key to config with new ID
3. Update packager to sign with new key
4. Deploy app update with both keys in config
5. After all users updated, remove old key

Example config during rotation:

```json
{
  "publicKeys": {
    "main": "old-key-here",
    "main-2024": "new-key-here"
  }
}
```

Manifest uses new key:

```json
{
  "bundle": {
    "signature": "...",
    "keyId": "main-2024"
  }
}
```

## Security Best Practices

1. **Never commit secret keys** - Use environment variables or secure storage
2. **Use different keys per environment** - dev, staging, prod should have separate keys
3. **Rotate keys quarterly** - Regular rotation reduces risk
4. **Disable debug in production** - Never set `skipSignatureCheck: true` in production
5. **Use HTTPS only** - Never use HTTP for manifest URLs
6. **Monitor metrics** - Track rollout health and errors

## Metrics Events

Events reported when metrics are enabled:

- **check**: Manifest check performed
- **updateAvailable**: New version available
- **downloadStart**: Download started
- **downloadProgress**: Download progress update
- **downloadComplete**: Download completed
- **downloadError**: Download failed
- **verifySuccess**: Verification passed
- **verifyFailed**: Verification failed
- **installStart**: Installation started
- **installComplete**: Installation completed
- **installError**: Installation failed
- **activate**: Bundle activated
- **healthy**: Bundle marked healthy
- **rollback**: Rollback performed
- **error**: General error

Metric payload example:

```json
{
  "event": "downloadComplete",
  "timestamp": 1704067200,
  "version": "1.2.3",
  "duration": 5432,
  "size": 1234567,
  "deviceId": "...",
  "platform": "ios",
  "sdkVersion": "12.3.0"
}
```

## Advanced Configuration

### Custom Asset Resolution

```javascript
OTA.initialize({
  // ... other config
  
  assetResolver: function(assetPath, bundleVersion) {
    // Custom logic to resolve asset URLs
    return 'https://assets.example.com/' + bundleVersion + '/' + assetPath;
  }
}, onReady, onError);
```

### Custom Rollout Filter

```javascript
OTA.initialize({
  // ... other config
  
  rolloutFilter: function(manifest) {
    // Custom logic to determine if user should get update
    const userId = getUserId();
    const percentage = manifest.rollout.percentage;
    
    // Consistent hash-based rollout
    const hash = simpleHash(userId + manifest.version);
    return (hash % 100) < percentage;
  }
}, onReady, onError);
```

### Health Check Callback

```javascript
OTA.initialize({
  // ... other config
  
  healthCheck: function(runtime) {
    // Custom health check logic
    // Return true if app is healthy, false otherwise
    
    // Example: Check if critical APIs are working
    try {
      testCriticalFeatures();
      return true;
    } catch (e) {
      return false;
    }
  }
}, onReady, onError);
```

