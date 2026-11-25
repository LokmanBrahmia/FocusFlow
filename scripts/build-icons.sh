#!/usr/bin/env bash
# Regenerates every raster/derived icon from the SVG sources in brand/.
# Needs ImageMagick 7 (`magick`). Run after editing brand/*.svg.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B="$ROOT/brand"
render() { magick -background none -density 1200 "$1" -resize "$2x$2" "$3"; }

render "$B/azm-icon.svg" 1024 "$ROOT/build/icon.png"            # electron-builder: Linux icons + Windows .ico
cp "$B/azm-icon.svg" "$ROOT/build/icon.svg"
render "$B/azm-tray.svg" 32 "$ROOT/resources/icons/tray.png"      # system tray
cp "$B/azm-tray.svg" "$ROOT/resources/icons/tray.svg"
cp "$B/azm-icon.svg" "$ROOT/landing/public/favicon.svg"            # website
render "$B/azm-icon.svg" 180 "$ROOT/landing/public/apple-touch-icon.png"
echo "Icons regenerated from brand/*.svg"
