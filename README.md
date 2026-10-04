# Lumen Studio

A small in-browser tool for making Lumen Project social media images, live at
**https://lumen.lumenproject.se**.

Upload an artist photo, set the top-left (`LUMEN PROJECT //`) and bottom-left text
(artist name, venue, date), then download every format at once. Everything runs in the
browser: nothing is uploaded anywhere.

- Formats (sizes as of October 2026): Instagram post 3:4 1080×1440 (matches the 3:4 profile
  grid, no cropping), feed post 4:5 1080×1350 (Instagram and Facebook), square 1080×1080,
  story/reel 1080×1920 (text kept inside the story safe zone), Facebook event 1920×1005,
  link preview 1200×630, 16:9 1920×1080.
- Export resolution: 1080 (standard), 1440 (Instagram's maximum upload width, the default;
  also wider than an iPhone Pro Max screen), 2160 or 3240. A card says when the photo is
  smaller than the export and has to be upscaled.
- Drop an image anywhere, including onto a preview; each format has its own crop: drag to
  move, pinch or the zoom slider to zoom, double-click to reset.
- Type is Barlow (the lumenproject.se typeface) at the size and margins measured from the
  Instagram posts; size, margin, weight and colour are adjustable.
- Text settings are remembered in the browser (Reset restores the defaults); the image is not.

## Develop

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000
```

## Deploy

GitHub Pages from `main` (root). Custom domain `lumen.lumenproject.se` via `CNAME`;
DNS is a Cloudflare `CNAME lumen → jonasjohansson.github.io` (DNS only).
