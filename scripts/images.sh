#!/usr/bin/env bash
# Turns the PNG masters that `bun run art` writes into the formats the page serves.
# It only adds files: delete the PNGs it replaces yourself (the list is printed at the end).
# Needs ImageMagick with WebP and AVIF support. Run it after `bun run art`: bun run images
set -euo pipefail
cd "$(dirname "$0")/.."
art=public/art
replaced=()

# Tijuana map: several widths for srcset, AVIF as the <picture> source and WebP as the <img> source.
if [ -f $art/tijuana.png ]; then
  for w in 800 1200 1600 2400; do
    magick $art/tijuana.png -resize "${w}x" -quality 55 "$art/tijuana-$w.avif"
    magick $art/tijuana.png -resize "${w}x" -quality 78 "$art/tijuana-$w.webp"
  done
  replaced+=("$art/tijuana.png")
fi

# Solution icons are shown at 88px: 2x is enough.
for f in $art/icon-*.png; do
  [ -f "$f" ] || continue
  magick "$f" -resize 176x176 -quality 85 "${f%.png}.webp"
  replaced+=("$f")
done

if [ -f $art/diorama.png ]; then
  magick $art/diorama.png -quality 82 $art/diorama.webp
  replaced+=("$art/diorama.png")
fi
if [ -f $art/hero-poster.png ]; then
  magick $art/hero-poster.png -quality 80 $art/hero-poster.webp
  replaced+=("$art/hero-poster.png")
fi

# The logo is shown at 168x56, so 3x is 504px. The PNG master stays: the README and art.ts use it.
magick public/brand/logo-light.png -resize 504x -quality 90 public/brand/logo-light.webp
# The favicon only needs 192px; the 512px master stays for the art script.
magick public/brand/favicon.png -resize 192x192 public/brand/favicon-192.png

if [ ${#replaced[@]} -gt 0 ]; then
  echo "Replaced, safe to delete:"
  printf '  %s\n' "${replaced[@]}"
fi
