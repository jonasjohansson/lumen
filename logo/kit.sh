#!/bin/zsh
# Export every version of the logo as kit files, tight on the ink: ./kit.sh [out-dir] [version …]
# Per version: <slug>-light.svg/png (Lumen white, for dark grounds) and <slug>-dark.svg/png (black, for light grounds); PNGs 4096 px wide.
here=${0:A:h}; out=${1:-${here:h}/brand/logos}; shift 2>/dev/null
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
url="http://localhost/${here#$HOME/GitHub/}/index.html"
versions=("$@")
if (( ! $#versions )); then
  versions=("${(@f)$(grep -o '<button data-t="[^"]*"[^>]*>[^<]*</button>' $here/index.html | sed 's/.*>\(.*\)<\/button>/\1/')}")
fi
typeset -A names=(
  "Lp" lumen-lp  "Lumen" lumen-wordmark  "Lumen small" lumen-wordmark-small  "Lumen Project" lumen-project-wordmark
  "Lumen / Project" lumen-project-stacked-step  "Lumen / Project swash" lumen-project-stacked-swash  "Lumen / Project clean" lumen-project-stacked
  "Circle" lumen-circle  "Project circle" lumen-project-circle  "Lu-man" lumen-lu-man  "Lu-star" lumen-lu-star
  "Symbol" lumen-symbol  "Symbol small" lumen-symbol-small  "Symbol fine" lumen-symbol-fine  "lp ring" lumen-lp-ring  "lp wreath" lumen-lp-wreath )
mkdir -p $out
grab() {   # url -> contents of #out
  "$chrome" --headless=new --disable-gpu --virtual-time-budget=4000 --user-data-dir=$(mktemp -d) --dump-dom "$1" 2>/dev/null |
    python3 -c 'import sys,re,html; m=re.search(r"<pre id=\"out\">(.*?)</pre>", sys.stdin.read(), re.S); sys.stdout.write(html.unescape(m.group(1)) if m else "")'
}
for v in $versions; do
  s=${names[$v]:-lumen-${${v:l}//[ \/]/-}}
  for ink in light dark; do
    q="$url?render=1&v=${v// /%20}&ink=$ink"
    grab "$q&out=svg" > $out/$s-$ink.svg
    grab "$q&out=png&px=4096" | sed 's/^data:image\/png;base64,//' | base64 -d > $out/$s-$ink.png
    echo $out/$s-$ink.{svg,png}
  done
done
