# OTA Configuration in tiapp.xml

## Overview

The Titanium OTA system can be enabled and configured directly in your `tiapp.xml` file. When enabled, the build hook automatically copies OTA modules to your project during compilation.

## Enable OTA

Add this property to your `tiapp.xml`:

```xml
<ti:app xmlns:ti="http://ti.titaniumsdk.com">
  <property name="ti.ota.enabled" type="bool">true</property>
</ti:app>
```

## Optional Configuration Properties

### Manifest URL

Specify the default manifest URL:

```xml
<property name="ti.ota.manifestUrl" type="string">https://cdn.example.com/manifest.json</property>
```

### Channel

Specify the release channel (production, staging, beta, etc.):

```xml
<property name="ti.ota.channel" type="string">production</property>
```

### Public Keys

Configure Ed25519 public keys for signature verification:

```xml
<property name="ti.ota.publicKey.main" type="string">your-ed25519-public-key-hex</property>
<property name="ti.ota.publicKey.backup" type="string">your-backup-key-hex</property>
```

### Debug Mode

Enable debug mode for development:

```xml
<property name="ti.ota.debug" type="bool">true</property>
```

⚠️ **Warning:** Debug mode may skip signature verification. Never use in production!

## Complete Example

### Production Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ti:app xmlns:ti="http://ti.titaniumsdk.com">
  <name>MyApp</name>
  <id>com.example.myapp</id>
  <version>1.0.0</version>
  
  <!-- Enable OTA -->
  <property name="ti.ota.enabled" type="bool">true</property>
  
  <!-- OTA Configuration -->
  <property name="ti.ota.manifestUrl" type="string">https://cdn.example.com/prod/manifest.json</property>
  <property name="ti.ota.channel" type="string">production</property>
  
  <!-- Public Keys for Signature Verification -->
  <property name="ti.ota.publicKey.main" type="string">1234567890abcdef...</property>
  <property name="ti.ota.publicKey.backup" type="string">fedcba0987654321...</property>
  
  <!-- Debug disabled for production -->
  <property name="ti.ota.debug" type="bool">false</property>
</ti:app>
```

### Development Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ti:app xmlns:ti="http://ti.titaniumsdk.com">
  <name>MyApp Dev</name>
  <id>com.example.myapp.dev</id>
  <version>1.0.0-dev</version>
  
  <!-- Enable OTA -->
  <property name="ti.ota.enabled" type="bool">true</property>
  
  <!-- Dev Configuration -->
  <property name="ti.ota.manifestUrl" type="string">http://localhost:3000/manifest.json</property>
  <property name="ti.ota.channel" type="string">development</property>
  
  <!-- Dev Public Key -->
  <property name="ti.ota.publicKey.dev" type="string">dev-key-here...</property>
  
  <!-- Debug enabled for development -->
  <property name="ti.ota.debug" type="bool">true</property>
</ti:app>
```

### Staging Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ti:app xmlns:ti="http://ti.tianiumsdk.com">
  <name>MyApp Staging</name>
  <id>com.example.myapp.staging</id>
  <version>1.0.0-staging</version>
  
  <!-- Enable OTA -->
  <property name="ti.ota.enabled" type="bool">true</property>
  
  <!-- Staging Configuration -->
  <property name="ti.ota.manifestUrl" type="string">https://staging-cdn.example.com/manifest.json</property>
  <property name="ti.ota.channel" type="string">staging</property>
  
  <!-- Staging Public Key -->
  <property name="ti.ota.publicKey.staging" type="string">staging-key-here...</property>
  
  <!-- Light debug for staging -->
  <property name="ti.ota.debug" type="bool">true</property>
</ti:app>
```

## Build Hook Behavior

When `ti.ota.enabled` is set to `true`, the build hook will:

1. ✅ Copy OTA modules from SDK to `Resources/ota/`
2. ✅ Skip copying if files are already up to date
3. ✅ Log the operation in build output
4. ✅ Check for optional `Resources/ota.config.json`

### Build Output Example

```
[INFO]  [OTA] OTA enabled - copying OTA modules to Resources/ota/
[DEBUG] [OTA] Copied: boot.js
[DEBUG] [OTA] Copied: state.js
[DEBUG] [OTA] Copied: runtime.js
[DEBUG] [OTA] Copied: crypto.js
[DEBUG] [OTA] Copied: verify.js
[DEBUG] [OTA] Copied: downloader.js
[DEBUG] [OTA] Copied: installer.js
[DEBUG] [OTA] Copied: metrics.js
[DEBUG] [OTA] Copied: cdn.js
[INFO]  [OTA] ✓ OTA modules ready (9/9 files)
[INFO]  [OTA] Manifest URL: https://cdn.example.com/manifest.json
[INFO]  [OTA] Channel: production
```

## Using Configuration in Code

Read tiapp.xml properties in your app:

```javascript
// Resources/app.js
const OTA = require('ota/boot');

// Read configuration from tiapp.xml
const manifestUrl = Ti.App.Properties.getString('ti.ota.manifestUrl');
const channel = Ti.App.Properties.getString('ti.ota.channel', 'production');
const debugMode = Ti.App.Properties.getBool('ti.ota.debug', false);

// Build public keys object
const publicKeys = {};
const keyProperties = [
  'ti.ota.publicKey.main',
  'ti.ota.publicKey.backup',
  'ti.ota.publicKey.dev',
  'ti.ota.publicKey.staging'
];

keyProperties.forEach(function(prop) {
  const key = Ti.App.Properties.getString(prop);
  if (key) {
    const keyId = prop.split('.').pop(); // Extract 'main', 'backup', etc.
    publicKeys[keyId] = key;
  }
});

// Initialize OTA with tiapp.xml configuration
OTA.initialize({
  manifestUrl: manifestUrl,
  channel: channel,
  publicKeys: publicKeys,
  debug: {
    enabled: debugMode,
    skipSignatureCheck: debugMode,
    verboseLogging: debugMode
  }
}, function onReady(runtime) {
  runtime.start();
  
  // Your app code...
  
}, function onError(error) {
  Ti.API.error('OTA failed: ' + error.message);
});
```

## Environment-Specific Builds

Use different tiapp.xml files for different environments:

```
project/
├── tiapp.xml                  # Base configuration
├── tiapp.production.xml       # Production overrides
├── tiapp.staging.xml          # Staging overrides
└── tiapp.development.xml      # Development overrides
```

Then use Titanium CLI to specify which configuration to use:

```bash
# Build with production config
ti build -p ios --tiapp tiapp.production.xml

# Build with staging config
ti build -p android --tiapp tiapp.staging.xml

# Build with development config
ti build -p ios --tiapp tiapp.development.xml
```

## Programmatic Override

You can still override tiapp.xml settings programmatically:

```javascript
const OTA = require('ota/boot');

// Override tiapp.xml settings
OTA.initialize({
  manifestUrl: 'https://custom-cdn.example.com/manifest.json', // Override
  channel: Ti.App.Properties.getString('ti.ota.channel'),       // Use tiapp.xml
  publicKeys: {
    main: 'custom-key-here' // Override
  }
}, onReady, onError);
```

## Disabling OTA

To disable OTA, simply set the property to `false`:

```xml
<property name="ti.ota.enabled" type="bool">false</property>
```

Or remove the property entirely. When disabled:
- Build hook will not copy OTA modules
- No additional files added to your app
- No impact on app size or performance

## Troubleshooting

### OTA modules not copied

**Problem:** Build completes but OTA modules are not in Resources/ota/

**Solutions:**
1. Verify `ti.ota.enabled` is set to `true` in tiapp.xml
2. Check build output for OTA log messages
3. Ensure Titanium SDK includes OTA templates
4. Try cleaning and rebuilding: `ti clean && ti build`

### Build hook not running

**Problem:** No OTA log messages in build output

**Solutions:**
1. Check SDK version (requires SDK with OTA support)
2. Verify hook file exists: `$SDK/cli/hooks/ota.js`
3. Check hook permissions: `chmod +x cli/hooks/ota.js`

### Configuration not applied

**Problem:** App doesn't use tiapp.xml OTA settings

**Solutions:**
1. Verify you're reading properties with `Ti.App.Properties.getString()`
2. Check property names match exactly (case-sensitive)
3. Ensure properties are inside `<ti:app>` tag
4. Rebuild app after changing tiapp.xml

## Best Practices

1. ✅ **Use different keys per environment** - Separate keys for dev/staging/prod
2. ✅ **Never commit secret keys** - Only public keys in tiapp.xml
3. ✅ **Disable debug in production** - Always set `ti.ota.debug` to `false`
4. ✅ **Use HTTPS for manifest URLs** - Never use HTTP in production
5. ✅ **Version your tiapp.xml** - Track changes in version control
6. ✅ **Test configuration changes** - Verify OTA works after tiapp.xml updates

## Property Reference

| Property Name | Type | Required | Default | Description |
|--------------|------|----------|---------|-------------|
| `ti.ota.enabled` | bool | Yes | false | Enable/disable OTA system |
| `ti.ota.manifestUrl` | string | No | null | Default manifest URL |
| `ti.ota.channel` | string | No | production | Release channel |
| `ti.ota.publicKey.*` | string | No | null | Ed25519 public keys (one per key ID) |
| `ti.ota.debug` | bool | No | false | Enable debug mode |

## See Also

- [Main OTA Documentation](./README.md)
- [Configuration Guide](./CONFIG.md)
- [Manifest Specification](./MANIFEST.md)
- [Build Guide](./BUILD.md)

