# Gallery media

Drop the photos and videos for the reel in this folder.

## Quick version

1. Add media here:
   - photos: `jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`, `svg`
   - videos: `mp4`, `webm`, `ogv`, `m4v`, `mov`
2. Optionally caption them in `captions.json`.
3. From the project root, run:

   ```powershell
   npm run gallery
   ```

4. Refresh the page. `photos.js` is regenerated automatically.

## Naming and order

The reel sorts by filename using numeric-aware order, so prefixes control the
sequence:

```
01-first-spin.jpg
02-blueberry-slice.jpg
03-the-good-ear.jpg
04-golden-hour.mp4
...
```

Recommended:
- Photos: square-ish, at least 1000 × 1000 px, under ~500 KB each.
- Videos: MP4 (H.264 + AAC) or WebM, 720p or smaller, 5–15 seconds, a few MB
  each. The reel shows a muted preview; the lightbox plays the clip with sound
  and controls.

Large videos are downloaded by every visitor, so compress them first. For
example, with ffmpeg:

```powershell
ffmpeg -i input.mov -vf "scale=720:-2" -c:v libx264 -crf 26 -preset medium -c:a aac -b:a 128k -movflags +faststart 07-birthday.mp4
```

`-movflags +faststart` lets the video start before it has fully downloaded.

## Captions and alt text

`captions.json` maps a filename to a caption and an optional alt description.
The alt text becomes the video's accessible label in the lightbox too:

```json
{
  "07-cake.jpg": {
    "caption": "Twenty-three candles, one wish",
    "alt": "A birthday cake with lit candles on a dark wooden table."
  },
  "08-first-slice.mp4": {
    "caption": "First slice, first bite",
    "alt": "Hisham cutting the birthday cake."
  }
}
```

A plain string also works:

```json
{ "07-cake.jpg": "Twenty-three candles, one wish" }
```

If a file has no entry, the caption is derived from its filename and the
caption is reused as the alt text.

## What gets generated

`photos.js` is written by `scripts/build-gallery.mjs` and is committed so the
gallery also works when `index.html` is opened directly over `file://`:

```js
window.HISHAM_GALLERY = [
  {
    src: "assets/gallery/07-cake.jpg",
    type: "image",
    caption: "…",
    alt: "…"
  },
  {
    src: "assets/gallery/08-first-slice.mp4",
    type: "video",
    caption: "…",
    alt: "…"
  }
];
```

Do not edit `photos.js` by hand — rerun the build instead. Netlify runs the
same build on deploy.

The current `.svg` files are illustrated placeholders; replace or delete them
as real media arrives.
