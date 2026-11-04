#!/bin/bash
# Convert WebP textures to KTX2 (Basis Universal) for GPU-compressed VRAM.
#
# Prerequisites:
#   - Install toktx from KTX-Software: https://github.com/KhronosGroup/KTX-Software
#   - Or use basisu: https://github.com/BinomialLLC/basis_universal
#
# Usage:
#   chmod +x scripts/convert-ktx2.sh
#   ./scripts/convert-ktx2.sh
#
# Note: WebP must first be converted to PNG (toktx doesn't read WebP directly).

set -euo pipefail

TEXTURE_DIR="public/textures"
OUTPUT_DIR="public/textures/ktx2"

mkdir -p "$OUTPUT_DIR"

echo "🔄 Converting textures to KTX2 (Basis Universal)..."

for webp_file in "$TEXTURE_DIR"/*.webp; do
  basename=$(basename "$webp_file" .webp)
  png_file="/tmp/${basename}.png"
  ktx2_file="${OUTPUT_DIR}/${basename}.ktx2"

  echo "  Converting: $basename"

  # Step 1: WebP → PNG (requires cwebp/dwebp or ImageMagick)
  if command -v magick &> /dev/null; then
    magick "$webp_file" "$png_file"
  elif command -v convert &> /dev/null; then
    convert "$webp_file" "$png_file"
  elif command -v dwebp &> /dev/null; then
    dwebp "$webp_file" -o "$png_file"
  else
    echo "  ❌ No image converter found (need ImageMagick or dwebp)"
    exit 1
  fi

  # Step 2: PNG → KTX2 with Basis Universal compression
  if command -v toktx &> /dev/null; then
    toktx --bcmp --clevel 2 --qlevel 128 --assign_oetf srgb "$ktx2_file" "$png_file"
  elif command -v basisu &> /dev/null; then
    basisu -ktx2 -comp_level 2 -q 128 -file "$png_file" -output_file "$ktx2_file"
  else
    echo "  ❌ No KTX2 encoder found (need toktx or basisu)"
    exit 1
  fi

  rm -f "$png_file"
  echo "  ✅ $ktx2_file"
done

echo ""
echo "✅ All textures converted. Update main.js to use KTX2Loader."
