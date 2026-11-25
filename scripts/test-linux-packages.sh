#!/usr/bin/env bash
# Installs the built DEB and RPM in clean containers and runs the app's
# --smoke-test as a normal (non-root) user under a virtual display, so the
# Chromium sandbox stays enabled. Nothing is installed on the host.
#
# Usage: scripts/test-linux-packages.sh [docker|podman]
# Needs: release/FocusFlow-<version>_amd64.deb and release/FocusFlow-<version>.x86_64.rpm
set -euo pipefail

ENGINE="${1:-docker}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
DEB="FocusFlow-${VERSION}_amd64.deb"
RPM="FocusFlow-${VERSION}.x86_64.rpm"

for f in "$DEB" "$RPM"; do
  [[ -f "$ROOT/release/$f" ]] || { echo "Missing release/$f. Run: npm run dist:linux" >&2; exit 1; }
done

SMOKE='timeout 120 xvfb-run -a focusflow --smoke-test 2>/dev/null | grep FOCUSFLOW_SMOKE'

run() {
  local name="$1" image="$2" install="$3"
  echo "── $name ($image) ──────────────────────────────────────────"
  "$ENGINE" run --rm -v "$ROOT/release:/pkgs:ro,z" "$image" bash -euo pipefail -c "
    $install
    useradd -m tester
    echo 'Installed:' \$(command -v focusflow)
    su tester -c '$SMOKE'
  "
}

run "Ubuntu 22.04 / DEB" ubuntu:22.04 "
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >/dev/null
  apt-get install -y -qq /pkgs/$DEB xvfb xauth >/dev/null
"

run "Fedora 41 / RPM" fedora:41 "
  dnf install -y -q /pkgs/$RPM xorg-x11-server-Xvfb xorg-x11-xauth util-linux shadow-utils >/dev/null
"

echo "All package smoke tests passed."
