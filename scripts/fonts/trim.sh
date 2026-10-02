#!/usr/bin/env bash
# Trims Mona Sans (OFL, from @fontsource-variable/mona-sans) to what Sky Mode uses (tracker M3.2):
# width 80–100 (the three width styles), weight 500–800, ASCII + the accents and marks the content uses
# (é ≈ – · × ° → etc.). Other characters fall back to the system font. Re-run if content needs more.
# Needs fonttools and brotli:  python3 -m venv .venv && .venv/bin/pip install fonttools brotli
set -euo pipefail
PY=${PY:-python3}
SRC=node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wdth-normal.woff2
OUT=src/assets/fonts/mona-sans-sky.woff2
TMP=$(mktemp -d)
"$PY" -m fontTools varLib.instancer "$SRC" wdth=80:100 wght=500:800 -o "$TMP/inst.ttf"
"$PY" -m fontTools subset "$TMP/inst.ttf" \
  --unicodes="U+0020-007E,U+00A0,U+00A9,U+00B0,U+00B1,U+00B7,U+00D7,U+00E0-00EF,U+00F1-00F6,U+00F9-00FC,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2190-2193,U+2212,U+2248,U+2264-2265" \
  --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case' \
  --flavor=woff2 --output-file="$OUT"
rm -rf "$TMP"
ls -l "$OUT"
