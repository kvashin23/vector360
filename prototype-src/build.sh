#!/usr/bin/env bash
# Собирает главную и страницы объектов из общего шаблона.
set -euo pipefail
cd "$(dirname "$0")"
export LC_ALL=C

assets() {
  local name=$1 ext=$2 mime=$3 project=$4 f
  printf 'const %s={' "$name"
  for f in assets/*."$ext"; do
    printf '%s:"' "$(basename "$f" ".$ext")"
    if [ -n "$project" ]; then
      printf '../prototype-src/%s' "$f"
    else
      printf 'data:%s;base64,' "$mime"
      base64 -w0 "$f"
    fi
    printf '",'
  done
  printf '};\n'
}

build() {
  local out=$1 project=${2:-}
  {
    sed -n -e 's/\r$//' -e '1,/^__ASSETS__$/p' template.html | sed '$d' |
      sed "s/<body data-theme=\"karluu\">/<body data-theme=\"${project:-karluu}\"${project:+ data-project=\"$project\"}>/"
    assets IMG jpg image/jpeg "$project"
    assets VID mp4 video/mp4 "$project"
    sed -n -e 's/\r$//' -e '/^__ASSETS__$/,$p' template.html | sed '1d'
  } > "$out"
  echo "built $out ($(wc -c < "$out") bytes)"
}

build ../index.html
for project in karluu mariupol; do
  mkdir -p "../$project"
  build "../$project/index.html" "$project"
done
