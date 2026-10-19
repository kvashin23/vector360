#!/usr/bin/env bash
# Собирает index.html: подставляет картинки и видео из assets/ в template.html как base64.
set -e
cd "$(dirname "$0")"
out=../index.html
{
  sed -n '1,/^__ASSETS__$/p' template.html | sed '$d'
  printf 'const IMG={'
  for f in assets/*.jpg; do printf '%s:"data:image/jpeg;base64,' "$(basename "$f" .jpg)"; base64 -w0 "$f"; printf '",'; done
  printf '};\nconst VID={'
  for f in assets/*.mp4; do printf '%s:"data:video/mp4;base64,' "$(basename "$f" .mp4)"; base64 -w0 "$f"; printf '",'; done
  printf '};\n'
  sed -n '/^__ASSETS__$/,$p' template.html | sed '1d'
} > "$out"
echo "built $out ($(wc -c < "$out") bytes)"
