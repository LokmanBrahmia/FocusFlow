#!/usr/bin/env bash
# Runs inside a clean container (see test-linux-packages.sh): installs one
# FocusFlow package with the distribution's own package manager, so declared
# dependencies are resolved exactly as on a user's machine, then runs the
# smoke test as a non-root user.
set -euo pipefail
PACKAGE="$1"

if command -v apt-get >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >/dev/null
  apt-get install -y -qq "$PACKAGE" xvfb xauth >/dev/null
elif command -v dnf >/dev/null; then
  dnf install -y -q "$PACKAGE" xorg-x11-server-Xvfb xorg-x11-xauth util-linux shadow-utils >/dev/null
else
  echo "Unsupported container image" >&2
  exit 1
fi

echo "Installed: $(command -v focusflow)"
useradd -m tester

if ! out="$(su tester -c 'timeout 120 xvfb-run -a focusflow --smoke-test' 2>&1)"; then
  echo "Smoke test FAILED. App output:" >&2
  echo "$out" | tail -20 >&2
  exit 1
fi
echo "$out" | grep FOCUSFLOW_SMOKE
