# Chalk Story Board

A blackboard for telling stories. Drag free いらすとや (Irasutoya) stickers onto the board, give them name tags, animate them,
and draw around them with chalk.

**Live:** https://phongpisut.github.io/chalk-story-board/

## Features

- **25,000+ stickers.** Search them in English or Japanese ("king", "angry cat", "猫"), or browse 18 story categories.
- **Name tags.** Select a sticker and type a name; it shows above the picture.
- **10 animations.** Each can loop or play on click:
  - Bounce, Shake, Float, Spin, Heartbeat and Talk.
  - Strike through, Blow to bits, Melt and Poof. On click, these four break the picture apart and the next click restores it.
- **Chalk tools.** Brush, circle, arrow, text and eraser, in 7 colours. Ctrl + scroll changes the brush size. Undo and wipe.
- **Pages.** Add, remove and flip between pages (Ctrl + ← / →). Each page keeps its own stickers, text and chalk.
- **Autosave.** All pages are saved in your browser (IndexedDB).

Shortcuts: `V` move · `B` chalk · `C` circle · `A` arrow · `T` text · `E` eraser · `Del` delete the selected item ·
`Ctrl+Z` undo chalk · `Ctrl+C` / `Ctrl+V` copy and paste · `Ctrl+←` / `Ctrl+→` change page · hold `Shift` while rotating to snap the angle.

## Run locally

```bash
python serve.py 5186
```

Then open http://localhost:5186.

## Rebuild the sticker index

```bash
node tools/fetch-irasutoya.mjs   # reads the public Blogger feed into tools/raw.json
node tools/build-catalog.mjs     # adds tags and categories, writes public/catalog.json
```

Only the index is stored here. The images load straight from Irasutoya's servers, because their terms do not allow
redistributing the image files. See https://www.irasutoya.com/p/faq.html for the usage terms. Commercial use is limited
to 20 images per work.

## Credits

Made by **Claude** & **P.Meemuk**. Illustrations by [いらすとや](https://www.irasutoya.com/).
