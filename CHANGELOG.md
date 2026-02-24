# [13.4.0](https://github.com/jonasfunk/titanium-sdk/compare/13.3.0...13.4.0) (2026-02-24)

## About this release

Titanium SDK 13.4.0 is a minor release of the SDK, focused on NavigationWindow improvements, new UI features, and cross-platform event handling enhancements.

## New Features

### Android

* **NavigationWindow**: Enhanced close/open lifecycle — NavigationWindow no longer creates a spurious Activity, `close()` works correctly, and the `windows` array stays in sync when child windows are closed via back button or directly ([836d8f4](https://github.com/jonasfunk/titanium-sdk/commit/836d8f44d2))
* **NavigationWindow**: Added `windows` array property to access the current window stack ([9d3b063](https://github.com/jonasfunk/titanium-sdk/commit/9d3b06394b))
* **Window**: Added `willClose` event, fired before a window begins closing ([b29f9f1](https://github.com/jonasfunk/titanium-sdk/commit/b29f9f1218))
* **Label**: Added `padding` property for controlling internal text padding ([0d4cf01](https://github.com/jonasfunk/titanium-sdk/commit/0d4cf010f6))

### iOS

* **NavigationWindow**: Added `insertWindow` method to insert a window at a specific index in the navigation stack ([2aee62d](https://github.com/jonasfunk/titanium-sdk/commit/2aee62dfb5), [e534718](https://github.com/jonasfunk/titanium-sdk/commit/e53471869a))
* **NavigationWindow**: Support creation without `window` property — the first `openWindow` call now sets the root window dynamically ([836d8f4](https://github.com/jonasfunk/titanium-sdk/commit/836d8f44d2))
* **Window**: Added `willClose` event, fired before a window begins closing ([b29f9f1](https://github.com/jonasfunk/titanium-sdk/commit/b29f9f1218))
* **Label**: Added `padding` property for controlling internal text padding ([0d4cf01](https://github.com/jonasfunk/titanium-sdk/commit/0d4cf010f6))

## Bug Fixes

### Android & iOS

* **View**: Fixed event handling for children added directly in the creation dictionary ([51d8eb5](https://github.com/jonasfunk/titanium-sdk/commit/51d8eb541a))

### iOS

* **NavigationWindow**: Fixed `insertWindow` transition handling and stack management ([eab6b7c](https://github.com/jonasfunk/titanium-sdk/commit/eab6b7c521))

## Community Credits

* jonasfunk
  * enhance NavigationWindowProxy close/open lifecycle and windows array sync ([836d8f4](https://github.com/jonasfunk/titanium-sdk/commit/836d8f44d2))
  * added willClose event to windows ([b29f9f1](https://github.com/jonasfunk/titanium-sdk/commit/b29f9f1218))
  * added a windows array property ([9d3b063](https://github.com/jonasfunk/titanium-sdk/commit/9d3b06394b))
  * proper eventhandling for children added directly in creation ([51d8eb5](https://github.com/jonasfunk/titanium-sdk/commit/51d8eb541a))
  * added insert window method ([e534718](https://github.com/jonasfunk/titanium-sdk/commit/e53471869a))
  * added padding to Ti.UI.Label ([0d4cf01](https://github.com/jonasfunk/titanium-sdk/commit/0d4cf010f6))
  * updated insertWindow ([eab6b7c](https://github.com/jonasfunk/titanium-sdk/commit/eab6b7c521))
  * add insertWindow method to NavigationWindow ([2aee62d](https://github.com/jonasfunk/titanium-sdk/commit/2aee62dfb5))

# [13.3.0](https://github.com/tidev/titanium_mobile/compare/13_2_X...13.3.0) (2025-01-07)

## About this release

Titanium SDK 13.3.0 is a minor release of the SDK.

## New Features

### JavaScript

* **Array.at()**: Added polyfill for ES2022 `Array.prototype.at()` method, enabling negative indexing support for arrays (e.g., `arr.at(-1)` returns the last element).

### Android

* **Media**: Added `targetImageSize` option for image scaling in MediaModule, allowing precise control over output image dimensions.
* **TiImageHelper**: Added method to copy EXIF metadata from source to destination image, preserving photo metadata during image processing.

## Bug Fixes

### iOS

* **Slider**: Fixed issue where the `change` event was fired continuously during sliding instead of only when the value changes by a step increment.

## Community Credits

* jonasfunk
  * add Array polyfill for ES2022 .at() method support ([46cd3aa](https://github.com/tidev/titanium_mobile/commit/46cd3aa20b1ec729432234e145dc924d1fb634fc))
  * add method to copy EXIF metadata from source to destination image ([a118994](https://github.com/tidev/titanium_mobile/commit/a118994159854715f6d9433cea1845d366ed83d9))
  * add targetImageSize option for image scaling in MediaModule ([0d6bf60](https://github.com/tidev/titanium_mobile/commit/0d6bf60cc9f506e95b24f92f166127dd858564a5))
  * make sure slider step change event is only fired on step ([294723e](https://github.com/tidev/titanium_mobile/commit/294723ef2b02a3e8ad497b42b5e19b1945351cfe))
