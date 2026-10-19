#!/bin/zsh
# Rebuild the brand kit after the logo changes: logo files, social sizes, icons, the zip and the PDF of this sheet.
here=${0:A:h}; cd $here
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
url="http://localhost/${here#$HOME/GitHub/}/index.html"
../logo/kit.sh $here/logos
place() { local w=$(( $3 * $6 / 100 )) h=$(( $4 * $7 / 100 )); magick -size $3x$4 xc:"$5" \( $1 -resize ${w}x${h} \) -gravity center -composite -strip $2; }   # src out W H ground max-w% max-h%
mkdir -p social icons; L=logos
place $L/lumen-symbol-light.png social/avatar-symbol-night.png 1080 1080 '#000' 62 62
place $L/lumen-symbol-dark.png  social/avatar-symbol-paper.png 1080 1080 '#ece9df' 62 62
place $L/lumen-project-circle-light.png social/avatar-circle-night.png 1080 1080 '#000' 80 80
place $L/lumen-project-wordmark-light.png social/banner-1500x500.png 1500 500 '#000' 70 40
place $L/lumen-project-wordmark-light.png social/facebook-cover-1640x624.png 1640 624 '#000' 62 40
place $L/lumen-project-stacked-light.png social/link-preview-1200x630.png 1200 630 '#000' 60 62
place $L/lumen-project-stacked-light.png social/post-1080x1350.png 1080 1350 '#000' 72 50
place $L/lumen-project-circle-light.png social/story-1080x1920.png 1080 1920 '#000' 74 40
for s in 512 192 180 32; do src=$L/lumen-symbol-small-light.png; (( s >= 180 )) && src=$L/lumen-symbol-light.png
  place $src icons/icon-$s.png $s $s '#000' 70 70; done
place $L/lumen-symbol-small-dark.png icons/icon-512-paper.png 512 512 '#ece9df' 70 70
magick $L/lumen-symbol-small-light.png -resize 32x32 -gravity center -background none -extent 32x32 icons/favicon-32-transparent.png
pngquant --force --ext .png --quality 85-98 --speed 1 logos/*.png social/*.png icons/*.png
rm -f lumen-brand-kit.zip && zip -qr lumen-brand-kit.zip logos social icons
# the sheet as a PDF and a board (both windows taller than 975 px, so the hero's vh cap gives one layout): a full-page screenshot at 1.5x (2x passes Chrome's 16384 px limit), cut into one page per section (the footer joins the last page)
tmp=$(mktemp -d)
rects=$("$chrome" --headless=new --disable-gpu --window-size=1440,4000 --virtual-time-budget=8000 --user-data-dir=$tmp/u1 --dump-dom "$url?rects" 2>/dev/null |
  python3 -c 'import sys,re,html; print(html.unescape(re.findall(r"<pre id=\"rects\" hidden=\"\">(.*?)</pre>", sys.stdin.read(), re.S)[-1]))')
h=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['h'])" "$rects")
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1.5 --window-size=1440,$h --virtual-time-budget=10000 --user-data-dir=$tmp/u2 --screenshot=$tmp/full.png "$url" 2>/dev/null
magick $tmp/full.png -resize 66.67% -quality 88 lumen-brand-board.jpg
python3 -c "
import json,sys; r=json.loads(sys.argv[1])['r']; r[-2][1]=r[-1][0]+r[-1][1]-r[-2][0]
for i,(t,hh) in enumerate(r[:-1]): print(round(1.5*hh), round(1.5*t), i)" "$rects" | while read ph py i; do
  magick $tmp/full.png -crop 2160x$ph+0+$py +repage $tmp/page-$(printf %02d $i).png; done
magick $tmp/page-*.png -quality 85 -compress jpeg lumen-brand.pdf
rm -rf $tmp
ls -la lumen-brand-kit.zip lumen-brand.pdf lumen-brand-board.jpg
