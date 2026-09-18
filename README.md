# opensiro-web

Static multi-page site for **opensiro** — the company building the toolchain for
organizations that compile, and the ARCTIC reasoning benchmark.

## Working on OpenSiro?

Repository-local website and presentation work stays here.

For contributor roles, authority, escalation, cross-repository coordination, or organizational evolution across public OpenSiro projects, start at [`opensiro/vsm-oss-organization/CONTRIBUTOR_START.md`](https://github.com/opensiro/vsm-oss-organization/blob/main/CONTRIBUTOR_START.md).

This repository is a presentation layer. Canonical VSM Harness facts remain in their owning Profile/Skills/Index repositories, and canonical ARCTIC artifacts remain in `opensiro/arctic-0`.

The typography pairs Departure Mono with Instrument Sans. The design uses warm off-white backgrounds, sharp corners,
hairline dividers, and pale blue artwork with darker blue link accents. The home page explains the
work in plain language; each product has its own animated pixel mark.
Built as plain HTML/CSS/JS, with no runtime dependencies.

## Stack

Plain static site — **no build step, no dependencies, no framework.** All fonts and mascot artwork are bundled locally and loaded from `assets/`.

Runtime remains dependency-free. Regenerating the stabilized mascot GIF requires Pillow:
`uv run --no-project --with pillow python scripts/stabilize-mascot-gif.py`.

```
opensiro-web/
├── index.html       # landing — hero, mission, products & research previews
├── design.html      # footer-only mascot/logo download and typeface credits
├── design.css       # design documentation page styles
├── products.html    # vsmlite + opensiro overview
├── opensiro.html    # Cross-Flash sandbox article and synchronized run playback
├── vsm-index.html   # VSM Harness Index table + pinned GitHub refs
├── vsm-index.css    # VSM table, state, combo, and lightning styles
├── vsm-index.js     # A/C counts, ranking, sorting, and lightning
├── products.css     # product hero and inline term styles
├── products.js      # accessible inline term explanations
├── research.html    # ARCTIC detail + animated public training examples
├── research.js      # play on entry, pause offscreen, replay, reduced motion
├── globals.css      # tokens, @font-face, components (mono interface + sans body)
├── app.js           # active nav for the shared Products/Index/Research links
├── vines.js         # continuous central vine growth and viewport tracking
├── shared-hero.css  # aligned home/product heroes and copy transitions
├── hero-transition.js # native page transition guards for the shared heroes
├── assets/
│   ├── DepartureMono-Regular.woff2
│   ├── DepartureMono-Regular.woff
│   ├── DepartureMono-OFL.txt    # Departure Mono license (OFL-1.1)
│   ├── InstrumentSans-Regular.woff2
│   ├── InstrumentSans-OFL.txt # Instrument Sans license (OFL-1.1)
│   ├── mascot-logo.gif        # stabilized animated hero mascot
│   ├── mascot-logo.png        # reduced-motion fallback + nav mascot
│   ├── mascot-favicon.png     # alternate square mascot icon
│   ├── opensiro-mascot-kit.zip # mascot files + MIT notice
│   ├── opensiro-logo-kit.zip   # square, full, thin SVG logos + notices
│   ├── logo/                  # logo-factory source and outlined variants
│   ├── favicon-64x64.png      # wider browser + touch icon
│   ├── vsmlite-mark.svg      # animated parent/child mark
│   ├── opensiro-mark.svg     # animated benchmark mark
│   ├── arctic-mark.svg       # animated reasoning-core mark
│   ├── pixel-vine.png        # transparent climbing-vine sprite
│   ├── arctic-mountains.png  # transparent mountain silhouette
│   ├── social-preview.png   # shared Open Graph / X preview
│   └── ARTWORK.md            # generated-asset prompts and behavior
├── scripts/
│   ├── stabilize-mascot-gif.py
│   ├── build-arctic-assets.py # exact grid diagrams from public ARCTIC-0 pairs
│   └── sync-index-preview.cjs # refresh home preview from the ranked table
├── tests/
│   ├── garden-sync.test.cjs
│   ├── index-preview-sync.test.cjs
│   └── static-site.test.cjs
└── README.md
```

## Design language

| Token        | Value                              | Notes                          |
|--------------|------------------------------------|--------------------------------|
| `--bg`       | `#faf9f6`                          | warm off-white, NOT pure white |
| `--ink`      | `#18181b`                          | zinc-900 text                  |
| `--hairline` | `rgba(0,0,0,.10)`                  | section/button dividers        |
| `--tint`     | `rgba(0,0,0,.04)`                  | 4% section wash                |
| `--accent`   | `#9bafd2`                          | pale blue marks, ARCTIC hover  |
| `--accent-ink` | `#49658e`                        | readable links and focus       |
| `--font`     | `'DepartureMono', monospace`       | headings and interface text    |
| `--font-body` | `'InstrumentSans', sans-serif`   | research body paragraphs   |
| `--maxw`     | `1200px`                           | content width                  |

**Signature rules:**
- **Sharp corners** — `border-radius:0` everywhere except 6px status dots.
- **1px hairline borders** that fully invert on hover (fill ↔ outline swap).
- **Plain body copy** — sentence case, readable line lengths, uppercase reserved
  for small labels and navigation.
- **Clear hierarchy** — centered hero compositions, larger headings, and
  left-aligned product descriptions.
- **Dividers, not cards** — products separated by hairline lines, no boxed backgrounds.

## Motion and interactions

- `.vine-static` preserves the original bitmap vines along the home and product
  heroes. A smaller, muted `.vine-center` garden grows continuously behind the
  home and product copy. Tendrils gently explore before curling; sweeping, spring-like,
  and short flowering growth alternate. Stems keep their own direction with
  smooth joins. New randomized bends and flowers attach to existing stems; the
  viewport moves at a constant speed after the initial growth, letting older
  sections leave the bottom edge. Flowering does not change the camera speed.
  There is no fade, reset, or accumulating tangle. Offscreen sections
  are removed to keep the document bounded. Pause/Resume controls the garden;
  it also pauses offscreen and in hidden tabs. Reduced motion shows a completed
  still ornament; without JavaScript only the original static vines remain.
- Home and Products share the same hero layout. The garden keeps the visible
  branch recipes, growth position, and Pause state in per-tab session storage,
  including when returning through browser history. Only the visible sections
  are saved; reconstruction does not replay the full session. Storage failure
  falls back to a fresh local garden. Native cross-document view transitions
  change the hero copy in 200 ms while keeping the garden opaque. Deep links,
  scrolled pages, and reduced motion use ordinary navigation. Browsers without
  view transitions still restore the garden. Run the dependency-free lifecycle
  checks with `node tests/garden-sync.test.cjs`.
- The ARCTIC preview and research hero end in a black mountain silhouette.
  Hovering the section or focusing a link inside it turns the mountains pale blue.
- Each product has a separate bundled SVG mark with a small animation.
- Inline term explanations on the Products page appear on hover, focus, or tap;
  Escape and tapping outside dismiss them.
- Research includes Stack push/pop, Pills, and Tic-tac-toe training pairs, animated once with replay
  controls, and two task-derived hero assets. The diagrams use the source grids
  and palette. See `assets/arctic/README.md` for source, attribution, and rebuilding.
- `prefers-reduced-motion` shows the full vines and static product marks and
  keeps the existing still-image fallback for the mascot.
- Products, Index, and Research stay visible in the header on mobile, with no drawer.
  Both decorative side vines remain visible down to 320 px. Links and buttons
  have visible keyboard focus.

## Pages

| Route             | File            | Content                                   |
|-------------------|-----------------|-------------------------------------------|
| `/`               | `index.html`    | Hero, introduction, three-step approach, products & ARCTIC |
| `/design.html`    | `design.html`   | mascot and logo downloads, typeface and licenses |
| `/products.html`  | `products.html` | vsmlite + opensiro detail blocks            |
| `/vsm-index.html` | `vsm-index.html`| VSM Harness Index overview + source links |
| `/research.html`  | `research.html` | ARCTIC detail + stats + CTA               |

Each page shares the same sticky header (logo + Products/Index/Research nav), footer
(copyright + site links, including footer-only Design). Social links are paused in HTML
comments, ready to restore when the channels are available. The active nav item is
marked with `.active` in markup and re-asserted by `app.js` from
`location.pathname`.

## Links

Inter-page links are relative. External product links point at GitHub:

- `https://github.com/opensiro/terminal-bench-vsm` — vsmlite repo
- `https://github.com/opensiro/vsm-harness-index` — evidence-backed VSM harness catalog
- `https://github.com/opensiro/arctic-0` — ARCTIC-0 public archive

Paused social links (not rendered): `twitter.com/opensiro`, `youtube.com/@opensiro`,
`discord.gg/opensiro`.

The four rows in the home Index preview come from the first four rows of the Top 20 table in `vsm-index.html`.
After editing the full table, run `node scripts/sync-index-preview.cjs` to refresh `index.html`.
Run it with `--check` to report stale output without editing. The GitHub Pages workflow
syncs and checks the preview before publishing.

## Run

Open `index.html` directly in a browser. The site is fully static: every page,
stylesheet, script, font, and image is referenced with a relative local path,
so the pages work from a `file://` URL without a web server or build step.

For an optional HTTP preview (useful when checking browser policies or sharing
the folder on a local network), serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000/
# → http://localhost:8000/products.html
# → http://localhost:8000/research.html
```

Run the static-link audit from the repository root:

```bash
node tests/static-site.test.cjs
```

## Deploy

Push to any static host (GitHub Pages, Netlify, etc.). No build, no
`npm install`. When migrating to a framework, the shared header/footer/nav are
the natural extraction points into a layout component.

## License & attribution

The following licenses apply to this repository:

| Component | License | Owner |
|-----------|---------|-------|
| Landing source (HTML, CSS, JS) + mascot artwork | **MIT** | © 2026 opensiro |
| `Departure Mono` typeface (`assets/DepartureMono-Regular.*`) | **SIL Open Font License 1.1 (OFL-1.1)** | © 2022–2024 Helena Zhang |
| `Instrument Sans` typeface (`assets/InstrumentSans-Regular.woff2`) | **SIL Open Font License 1.1 (OFL-1.1)** | © 2022 The Instrument Sans Project Authors |
| ARCTIC-0 training pairs and derived grid diagrams (`assets/arctic/`, embedded in `research.html`) | **CC BY 4.0** | ARCTIC authors; see `assets/arctic/README.md` |

- The MIT license covers the landing code and the opensiro mascot. Full text:
  [`LICENSE`](LICENSE).
- **Departure Mono** by Helena Zhang ([departuremono.com](https://departuremono.com))
  is licensed under the OFL-1.1. Full text:
  [`assets/DepartureMono-OFL.txt`](assets/DepartureMono-OFL.txt).

**Required when copying or modifying this repository:** if you keep or adapt
the Departure Mono font, you must (a) credit "Departure Mono by Helena Zhang",
and (b) retain the OFL-1.1 text in `assets/DepartureMono-OFL.txt`. The font
cannot be relicensed under MIT or any other license.
