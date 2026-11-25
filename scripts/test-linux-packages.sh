#!/usr/bin/env bash
# Installs the built DEB and RPM in clean containers and runs the app's
# --smoke-test as a normal (non-root) user under a virtual display, so the
# Chromium sandbox stays enabled. Nothing is installed on the host.
#
# Usage: scripts/test-linux-packages.sh [docker|podman]
# Needs: release/<productName>-<version>_amd64.deb and release/<productName>-<version>.x86_64.rpm
set -euo pipefail

ENGINE="${1:-docker}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
PRODUCT="$(node -p "require('$ROOT/package.json').productName")"
DEB="${PRODUCT}-${VERSION}_amd64.deb"
RPM="${PRODUCT}-${VERSION}.x86_64.rpm"

for f in "$DEB" "$RPM"; do
  [[ -f "$ROOT/release/$f" ]] || { echo "Missing release/$f. Run: npm run dist:linux" >&2; exit 1; }
done

run() {
  local name="$1" image="$2" package="$3"
  echo "── $name ($image) ──────────────────────────────────────────"
  # seccomp=unconfined: Docker's default profile blocks the unprivileged user
  # namespaces Chromium's sandbox uses; desktop Ubuntu and Fedora allow them.
  # The app's sandbox stays ON (no --no-sandbox).
  "$ENGINE" run --rm --security-opt seccomp=unconfined \
    -v "$ROOT/release:/pkgs:ro,z" \
    -v "$ROOT/scripts/container-smoke.sh:/container-smoke.sh:ro,z" \
    "$image" bash /container-smoke.sh "/pkgs/$package"
}

run "Ubuntu 22.04 / DEB" ubuntu:22.04 "$DEB"
run "Fedora 41 / RPM" fedora:41 "$RPM"

echo "All package smoke tests passed."
