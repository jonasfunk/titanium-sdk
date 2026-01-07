Create GitHub Release

Purpose
- Create a new GitHub release on the fork with auto-generated release notes.

Usage
- Trigger this command and include the version number in your message, e.g. `13.3.0`.
- Optionally specify `--prerelease` for RC/beta releases.

Steps
1) Ensure we are at the repo root: `/Users/jonasfunk/Udvikling/titanium-sdk`.
2) Verify `gh` CLI is authenticated.
3) Extract version from user message (e.g. `13.3.0`).
4) Check if tag already exists - abort if it does.
5) Create release with auto-generated notes from commits since last release.
6) Open the release URL in browser for review.

Shell (non-interactive)
```bash
# repo root
cd /Users/jonasfunk/Udvikling/titanium-sdk

# ensure on correct branch and up to date
git checkout master
git pull --ff-only origin master || true

# set version (replace with actual version from user message)
VERSION="${VERSION:-13.3.0}"

# check if tag exists
if git rev-parse "refs/tags/$VERSION" >/dev/null 2>&1; then
  echo "Error: Tag $VERSION already exists"
  exit 1
fi

# create release with auto-generated notes
gh release create "$VERSION" \
  --title "$VERSION" \
  --generate-notes \
  --latest

echo "Release $VERSION created successfully!"
echo "View at: https://github.com/jonasfunk/titanium-sdk/releases/tag/$VERSION"
```

Pre-release variant
```bash
# For RC/beta releases, add --prerelease flag
gh release create "$VERSION" \
  --title "$VERSION" \
  --generate-notes \
  --prerelease
```

With custom notes file
```bash
# If you have a CHANGELOG or notes file
gh release create "$VERSION" \
  --title "$VERSION" \
  --notes-file CHANGELOG.md \
  --latest
```

Notes
- The `--generate-notes` flag auto-generates release notes from merged PRs and commits since the last release.
- Use `--prerelease` for RC, beta, or other non-stable releases.
- Use `--target <branch>` if releasing from a branch other than master.
- You can edit the release notes on GitHub after creation.
