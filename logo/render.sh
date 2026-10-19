#!/bin/zsh
# Screenshot every version of the logo lab headlessly: ./render.sh [out-dir] [version …]
# Versions are the labels of the version buttons; default is all of them.
here=${0:A:h}; out=${1:-$here/renders}; shift 2>/dev/null
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
url="http://localhost/${here#$HOME/GitHub/}/index.html"   # Apache serves ~/GitHub, so a copy of the lab in sandbox/<name>/ renders too
versions=("$@")
if (( ! $#versions )); then
  versions=("${(@f)$(grep -o '<button data-t="[^"]*"[^>]*>[^<]*</button>' $here/index.html | sed 's/.*>\(.*\)<\/button>/\1/')}")
fi
mkdir -p $out
for v in $versions; do
  f=$out/${${v:l}// /-}.png
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,1200 --virtual-time-budget=4000 \
    --user-data-dir=$(mktemp -d) --screenshot=$f "$url?render=1&v=${v// /%20}" >/dev/null 2>&1
  echo $f
done
