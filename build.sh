#!/bin/sh
# Builds index.html: one self-contained page with the styles, icon sprite, markup and script inlined
# and every image embedded as a data URI. Needs Node.js. Usage: sh build.sh
set -e
cd "$(dirname "$0")"
OUT=index.html
{
printf '%s\n' '<!doctype html>' '<html lang="en-AU">' '<head>' '<meta charset="utf-8">' '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' '<meta name="theme-color" content="#FFFFFF">' '<meta name="description" content="Prepaid data and talk and text plans for your Uniden devices and your phone. No lock-in contract. Activate in minutes.">' '<title>Uniden Mobile</title>' '<style>'
cat src/02-styles.css src/02b-utils.css
printf '%s\n' '</style>' '</head>' '<body>'
cat src/03-sprite.svg src/04-body.html
echo '<script>'
cat src/05-app.js
printf '%s\n' '</script>' '</body>' '</html>'
} > "$OUT"
node scripts/inline-assets.js "$OUT" assets
wc -c "$OUT"
