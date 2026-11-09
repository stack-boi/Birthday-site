# Hisham · 23 — Oldie hai aur goldie bhi

A small retro birthday site for Hisham's 23rd: vinyl, proper IEMs, a
blueberry-cherry cheesecake, a polaroid reel, and a record player that
actually makes sound.

## Open it

The site is plain HTML/CSS/JS. Open `index.html` directly in a browser, or
serve the folder:

```powershell
# from this folder
python -m http.server 8000
# then visit http://localhost:8000
```

Over `file://` everything works except shared notes: notes stay in that browser.
The photo reel reads the committed `assets/gallery/photos.js`, so it works
without a server too.

## What's inside

- `index.html` — all copy, sections, and the inline IEM + cake SVGs
- `assets/css/style.css` — layout, retro styling, vinyl/IEM/deck art, gallery, responsive rules
- `assets/js/player.js` — Web Audio synth engine and the three tracks
- `assets/js/main.js` — confetti, record player UI, cake wish, sleeve notes + sync client
- `assets/js/gallery.js` — polaroid reel, drag/arrow/keyboard controls, lightbox
- `assets/gallery/` — the photos and videos in the reel (see `assets/gallery/README.md`)
- `assets/gallery/photos.js` — generated gallery manifest (committed so `file://` works)
- `scripts/build-gallery.mjs` — regenerates the manifest from the gallery folder
- `netlify/functions/notes.js` — shared notes API backed by Netlify Blobs
- `netlify.toml` — build, functions, and `/api/notes` rewrite

## Adding photos and videos to the reel

1. Drop media files into `assets/gallery/`:
   - photos: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`, `.svg`
   - videos: `.mp4`, `.webm`, `.ogv`, `.m4v`, `.mov`
2. Optional: add a caption (and alt text) for each filename in
   `assets/gallery/captions.json`:

   ```json
   {
     "07-new-photo.jpg": {
       "caption": "The cake, before the candles",
       "alt": "A blueberry cheesecake on a wooden table."
     },
     "08-first-slice.mp4": {
       "caption": "First slice, first bite",
       "alt": "Hisham cutting the birthday cake."
     }
   }
   ```

3. Regenerate the manifest:

   ```powershell
   npm run gallery
   ```

4. Refresh the page. Files are ordered by filename, so numeric prefixes like
   `07-`, `08-` control the reel order.

Videos appear in the reel as a muted preview with a play badge. Tapping one
opens the lightbox and plays it with sound and native controls. MP4 (H.264 +
AAC) and WebM are the safest formats; keep clips short and compressed, since
every visitor downloads them. Netlify serves these files with a one-hour cache.

Netlify runs `npm run build` (the same manifest step) on every deploy, so the
reel stays current there even if you forget to run it locally. The six bundled
SVGs are placeholders — delete them once real media is in.

## Deploying to Netlify (shared notes)

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket) and import it in
   Netlify. Use a Git deploy or the Netlify CLI — Netlify Drop does not run
   builds or deploy functions, so shared notes would not work there.
2. Netlify reads `netlify.toml`:
   - build command `npm run build`
   - publish directory `.`
   - functions directory `netlify/functions`
   - `/api/notes` → `/.netlify/functions/notes` (status 200, so POST/DELETE survive)
3. Deploy. Netlify installs `@netlify/blobs` and creates the Blobs store on
   first use — no database setup or environment variables needed.
4. Open the deployed URL in two browsers (or two devices) and post a note in
   each. They should appear on the other within ~15 seconds, or immediately
   after switching tabs / coming back online.

For a local end-to-end test with real Blobs, install the Netlify CLI and run:

```powershell
npm install
netlify dev
```

Over a plain local server (or `file://`), the notes UI reports `this device`
and saves locally instead.

### Shared notes behaviour

- Local-first: a submitted note appears immediately and is saved in
  `localStorage` before it is sent.
- Sync: 15-second polling while the tab is visible, plus `online`,
  `visibilitychange`, and same-browser `BroadcastChannel` triggers.
- Ownership: each browser gets a private owner token. Only the author sees the
  remove button for a shared note; the token is never returned by the API.
- Limits: 220 characters per note, 24-character author name, 150 notes total,
  and 6 new notes per owner per minute.
- Storage keys: notes `hisham23-sleeve-notes-v1`, owner
  `hisham23-sleeve-owner-v1`, name `hisham23-sleeve-name-v1`.

**Preview deploys:** Netlify Blobs stores are site-scoped, so notes written on
a preview deploy are shared with the production deploy of the same site. Use a
separate Netlify site if you want an isolated test.

## Notes

- **Audio:** all three tracks (“Cherry On Top”, “Blueberry Static”, “Oldie
  Goldie”) are synthesized live with the Web Audio API. There are no audio
  files and nothing copyrighted is bundled.
- **Motion:** auto-confetti, record spin, and smooth reel scrolling are skipped
  when the visitor has `prefers-reduced-motion` enabled.
- **Without JS:** the birthday page still renders, with a note that the player,
  confetti, photo reel, and sleeve notes need JavaScript. The empty reel shell
  is hidden.
