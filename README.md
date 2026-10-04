# Lumen Studio

A small in-browser tool for making Lumen Project social media images, live at
**https://lumen.lumenproject.se**.

Upload an artist photo, set the top-left (`LUMEN PROJECT //`) and bottom-left text
(artist name, venue, date), then download every format at once. Everything runs in the
browser: nothing is uploaded anywhere.

- Formats: Instagram post 1080×1350, square 1080×1080, story/reel 1080×1920 (text kept
  inside the story safe zone), Facebook event 1920×1005, link preview 1200×630, 16:9 1920×1080.
- Each format has its own crop: drag to move, pinch or the zoom slider to zoom, double-click to reset.
- Type is Barlow (the lumenproject.se typeface) at the size and margins measured from the
  Instagram posts; size, margin, weight and colour are adjustable.
- Text settings are remembered in the browser; the image is not.

## Develop

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000
```

## Deploy

GitHub Pages from `main` (root). Custom domain `lumen.lumenproject.se` via `CNAME`;
DNS is a Cloudflare `CNAME lumen → jonasjohansson.github.io` (DNS only).
