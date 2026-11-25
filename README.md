# Some More Metaphysics

A static site for personal essays on meditation and spirituality, with an interactive book and ritual room. It runs on HTML, CSS, and JavaScript. There is no framework, database, runtime dependency, or sound system.

## Write and publish an essay

1. Add a Markdown file under `content/essays/`, such as `content/essays/attention.md`.
2. Start it with front matter:

   ```md
   ---
   slug: attention
   title: On Attention
   page: "87"
   order: 8
   published: true
   ---

   Write the essay here. Use a blank line between paragraphs.
   ```

3. Run `python3 scripts/build_content.py` from the project folder. This updates `content.json` from the published essay and ritual Markdown files. Set `published: false` to keep a draft off the site.
4. Preview locally (steps below), then commit both the `.md` file and updated `content.json` to GitHub.

## Publish ritual room instructions

Each practice in the ritual room has a source file in `content/rituals/`. Selecting a practice opens a book-like two-page reader with page-turn controls. To add or revise a practice, create or edit a `.md` file there:

```md
---
slug: grounding
title: A Grounding Practice
order: 4
published: true
---

1. Sit somewhere comfortable and let your hands rest.
2. Notice the points where your body meets the chair or floor.
3. Stay for a few quiet breaths, then return to the room.
```

The file name can be `grounding.md`; keep `slug` unique and stable. `order` controls the button order. Put the instructions in the body: blank lines make paragraphs, and numbered or bulleted Markdown lists are displayed as lists. The front matter `title` becomes the practice button label. After editing, run `python3 scripts/build_content.py`, preview the ritual room, and commit the Markdown plus regenerated `content.json`.

## Edit the bio

Edit `content/bio.md` to update the full bio page at `bio.html`. The coin at the lower left of the desk links to the bio page.

## Preview on your computer

From the project folder, start a local server:

```sh
python3 -m http.server 18765
```

Open <http://localhost:18765/>. Stop the server with Control+C in Terminal. Serve the files over HTTP; opening `index.html` directly will prevent its JavaScript modules and content from loading correctly.

## Host with GitHub Pages

1. Create a GitHub repository named `some-more-metaphysics` and add the project files at the repository root, with `index.html` at the root.
2. Open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, then choose `main` and `/(root)`. See [GitHub's publishing source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
3. Use the URL shown in the Pages settings when deployment finishes. Push commits to `main` to publish later updates.

GitHub Pages hosts files publicly. Review the repository contents before publishing.

## Project map

- `content/essays/*.md` — essay sources and metadata.
- `content/rituals/*.md` — ritual practice instructions and metadata.
- `content/bio.md` — source for the full bio page.
- `scripts/build_content.py` — generates browser content data from published essays and practices.
- `content.json` — generated data used by the site; commit it after running the script.
- `index.html`, `bio.html` — desk/book experience and bio page.
- `css/`, `js/`, `assets/`, `fonts/` — styling, interactions, images, and typefaces.
# Some-More-Metaphysics
