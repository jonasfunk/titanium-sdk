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
