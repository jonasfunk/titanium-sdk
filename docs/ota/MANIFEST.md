# OTA Manifest Specification

## Overview

The OTA manifest is a JSON file that describes a bundle release. It contains metadata, versioning information, cryptographic hashes, and signatures for verification.

## Manifest Schema

```json
{
  "schemaVersion": "1.0.0",
  "version": "1.2.3",
  "name": "My App Bundle",
  "description": "Feature update with bug fixes",
  
  "bundle": {
    "url": "https://cdn.example.com/bundles/1.2.3/bundle.zip",
    "hash": "abc123...",
    "size": 1234567,
    "signature": "def456...",
    "keyId": "main"
  },
  
  "compatibility": {
    "minSDKVersion": "12.0.0",
    "maxSDKVersion": "13.9.9",
    "minBinaryVersion": "1.0.0",
    "platform": ["ios", "android"]
  },
  
  "rollout": {
    "channel": "production",
    "percentage": 100,
    "regions": ["*"],
    "audienceFilter": null
  },
  
  "metadata": {
    "buildNumber": 123,
    "timestamp": 1234567890,
    "author": "CI/CD Pipeline",
    "commitHash": "abc123",
    "releaseNotes": "https://example.com/release-notes/1.2.3"
  },
  
  "deprecation": {
    "deprecated": false,
    "deprecationDate": null,
    "forceUpdateAfter": null
  },
  
  "assets": {
    "baseUrl": "https://cdn.example.com/assets/1.2.3/",
    "manifestUrl": "https://cdn.example.com/assets/1.2.3/asset-manifest.json"
  }
}
```

## Field Descriptions

### Root Fields

- **schemaVersion** (required): Manifest schema version (semver)
- **version** (required): Bundle version (semver)
- **name** (optional): Human-readable bundle name
- **description** (optional): Bundle description

### bundle

- **url** (required): Download URL for the bundle zip file
- **hash** (required): SHA-256 hash of the bundle (hex, 64 chars)
- **size** (required): Bundle file size in bytes
- **signature** (required): Ed25519 signature of the hash (hex, 128 chars)
- **keyId** (required): Public key identifier used for signature

### compatibility

- **minSDKVersion** (optional): Minimum Titanium SDK version required
- **maxSDKVersion** (optional): Maximum Titanium SDK version supported
- **minBinaryVersion** (optional): Minimum app binary version required
- **platform** (optional): Array of supported platforms ['ios', 'android']

### rollout

- **channel** (required): Release channel (production, beta, alpha, etc.)
- **percentage** (required): Rollout percentage (0-100)
- **regions** (optional): Array of region codes or ["*"] for all
- **audienceFilter** (optional): Custom audience filter expression

### metadata

- **buildNumber** (optional): CI/CD build number
- **timestamp** (required): Build timestamp (Unix time)
- **author** (optional): Build author/system
- **commitHash** (optional): Git commit hash
- **releaseNotes** (optional): URL to release notes

### deprecation

- **deprecated** (optional): Whether this bundle is deprecated
- **deprecationDate** (optional): When bundle was deprecated (ISO 8601)
- **forceUpdateAfter** (optional): Force update after this date (ISO 8601)

### assets

- **baseUrl** (optional): Base URL for asset resolution
- **manifestUrl** (optional): URL to asset manifest (for advanced asset management)

## Validation Rules

### Version Format

All version fields must follow semver format: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`

Examples:
- `1.0.0` ✓
- `2.1.3-beta.1` ✓
- `3.0.0+build.123` ✓
- `1.2` ✗ (missing patch)

### Hash Format

- Must be 64 hexadecimal characters (SHA-256)
- Example: `a3c5e7...` (64 chars total)

### Signature Format

- Must be 128 hexadecimal characters (Ed25519)
- Example: `b4d6f8...` (128 chars total)

### Rollout Percentage

- Must be integer between 0 and 100 (inclusive)
- 0 = disabled
- 100 = fully rolled out

### Timestamp

- Must be Unix timestamp (seconds since epoch)
- Must be positive integer

## Manifest Variants

### Minimal Manifest (POC)

```json
{
  "schemaVersion": "1.0.0",
  "version": "1.0.0",
  "bundle": {
    "url": "https://cdn.example.com/bundle.zip",
    "hash": "abc123...",
    "size": 1234567,
    "signature": "def456...",
    "keyId": "main"
  },
  "rollout": {
    "channel": "production",
    "percentage": 100
  },
  "metadata": {
    "timestamp": 1234567890
  }
}
```

### Full Production Manifest

```json
{
  "schemaVersion": "1.0.0",
  "version": "2.5.1",
  "name": "Q1 2024 Release",
  "description": "Major feature update with performance improvements",
  
  "bundle": {
    "url": "https://cdn1.example.com/bundles/2.5.1/bundle.zip",
    "hash": "a1b2c3d4e5f6789...",
    "size": 3145728,
    "signature": "9f8e7d6c5b4a321...",
    "keyId": "prod-2024-q1"
  },
  
  "compatibility": {
    "minSDKVersion": "12.3.0",
    "maxSDKVersion": "13.9.9",
    "minBinaryVersion": "2.0.0",
    "platform": ["ios", "android"]
  },
  
  "rollout": {
    "channel": "production",
    "percentage": 5,
    "regions": ["US", "CA", "GB"],
    "audienceFilter": "premium_users && beta_testers"
  },
  
  "metadata": {
    "buildNumber": 1523,
    "timestamp": 1704067200,
    "author": "GitHub Actions",
    "commitHash": "a1b2c3d4e5f67890",
    "releaseNotes": "https://example.com/releases/2.5.1"
  },
  
  "deprecation": {
    "deprecated": false,
    "deprecationDate": null,
    "forceUpdateAfter": null
  },
  
  "assets": {
    "baseUrl": "https://cdn1.example.com/assets/2.5.1/",
    "manifestUrl": "https://cdn1.example.com/assets/2.5.1/manifest.json"
  }
}
```

## Multiple CDN URLs

For CDN failover, use an array of manifest URLs:

```json
{
  "manifests": [
    "https://cdn1.example.com/manifest.json",
    "https://cdn2.example.com/manifest.json",
    "https://cdn3.example.com/manifest.json"
  ]
}
```

Or within the manifest, provide multiple bundle URLs:

```json
{
  "bundle": {
    "urls": [
      "https://cdn1.example.com/bundle.zip",
      "https://cdn2.example.com/bundle.zip"
    ],
    "hash": "...",
    "signature": "...",
    "keyId": "main"
  }
}
```

## Staged Rollout Example

### Initial Release (5%)

```json
{
  "version": "3.0.0",
  "rollout": {
    "channel": "production",
    "percentage": 5,
    "regions": ["*"]
  }
}
```

### After Validation (25%)

```json
{
  "version": "3.0.0",
  "rollout": {
    "channel": "production",
    "percentage": 25,
    "regions": ["*"]
  }
}
```

### Full Rollout (100%)

```json
{
  "version": "3.0.0",
  "rollout": {
    "channel": "production",
    "percentage": 100,
    "regions": ["*"]
  }
}
```

## Kill Switch

To disable a release:

```json
{
  "version": "3.0.0",
  "rollout": {
    "channel": "production",
    "percentage": 0
  },
  "deprecation": {
    "deprecated": true,
    "deprecationDate": "2024-01-15T00:00:00Z",
    "forceUpdateAfter": "2024-01-20T00:00:00Z"
  }
}
```

## Security Best Practices

1. **Always sign bundles** - Never deploy without Ed25519 signature
2. **Use key rotation** - Rotate signing keys quarterly
3. **Verify on client** - Always verify hash + signature before installation
4. **HTTPS only** - Never use HTTP for manifest or bundle URLs
5. **Certificate pinning** - Consider pinning CDN certificates
6. **Staged rollouts** - Start at 1-5%, monitor, then increase
7. **Kill switch ready** - Have process to set percentage to 0 quickly

## Manifest Evolution

When updating manifest schema:

1. Increment `schemaVersion`
2. Maintain backward compatibility
3. Document migration path
4. Support old and new schema for transition period

Example:

```json
{
  "schemaVersion": "2.0.0",
  "_schemaChanges": "Added assets.cdn field, deprecated assets.baseUrl"
}
```

