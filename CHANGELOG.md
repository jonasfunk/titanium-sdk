# [13.2.0](https://github.com/tidev/titanium_mobile/compare/13_1_X...13.2.0) (2025-12-02)

## About this release

Titanium SDK 13.2.0 is a minor release of the SDK.

## New Features

### Android

* **TiHTTPClient**: Added support for Brotli (`br`) decompression in HTTP responses. The client now automatically decompresses responses with `Content-Encoding: br` header, in addition to existing support for `gzip` and `deflate` encodings.
* **TiResponseCache**: Enhanced response cache to properly handle Brotli-compressed cached responses, ensuring cached content is correctly decompressed when retrieved.

## Community Credits

* jonasfunk
  * enhance TiHTTPClient to support Brotli decompression and improve response handling ([ddcc04d](https://github.com/tidev/titanium_mobile/commit/ddcc04dd1417041e0a179c4bf6fac2b128acfd85))
