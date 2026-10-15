# Michelle Store · 미셸 스토어

A Korean-first silk lookbook with an English edition. Michelle offers existing collection designs made to the customer’s measurements, not newly commissioned designs. Visitors select a collection design, Suzhou or Ruby silk, colors, quantities, and a note for each item. One set of measurements produces a proposal to copy into Instagram or download as a visual PNG. There is no checkout, payment, account, or customer database.

## Run locally with Docker

Install/start Docker Desktop, then run from this directory:

```sh
docker compose up --build -d
```

Open **http://localhost:8080**. The root redirects to `/ko/`; English is at `/en/`.

```sh
docker compose ps                # The storefront should be healthy
docker compose logs storefront  # Inspect server logs
docker compose down             # Stop the preview
```

After changing content or code, run `docker compose up --build -d` again. This is a production build served by an unprivileged Nginx container, not a live-edit server. It binds only to this computer's loopback address. If port 8080 is occupied:

```sh
PORT=8081 SITE_URL=http://localhost:8081 docker compose up --build -d
```

Or build and run the image directly:

```sh
docker build --build-arg SITE_URL=http://localhost:8080 -t michelle-store .
docker run --rm -p 127.0.0.1:8080:8080 michelle-store
```

## Develop and validate

Use Node.js 24 LTS and npm. Docker requires no host Node installation.

```sh
npm ci
npm run dev
```

Open http://localhost:4321. Astro 7 may run its development server in the background; stop it from this directory with `npx astro dev stop`.

```sh
npm test
npm run build
npm run preview
```

The build checks TypeScript and validates catalog data, then generates static HTML and optimized WebP images in `dist/`. Tests cover cart validation, duplicate/variant handling, quantities, unavailable options, recovery links, unit conversion, proposal completeness, and KRW prices.

## Content editing

| Location | Purpose |
| --- | --- |
| `src/content/designs/*.json` | One design per file, bilingual copy, stable ID, image, category, offered fabrics, prices, related posts |
| `src/content/fabrics.json` | Suzhou/Ruby descriptions, selectable colors, original chart paths |
| `src/content/settings.json` | Public Instagram/Threads handles and fixed KRW/Korean defaults |
| `assets/designs/` | Original design photos; keep filenames lowercase with hyphens |
| `assets/fabrics/` | Original fabric/color-book photos |
| `public/brand/michelle-logo.png` | Supplied logo, preserved unchanged |
| `.pages.yml` | Optional Pages CMS editor configuration |

- Keep IDs such as `ML-01` and existing color IDs stable. Saved selections reference these IDs. Slugs form the page URLs.
- Use `published: false` to hide a design. Existing selections are flagged for review rather than silently removed. Keep at least one design published.
- `featured: true` chooses homepage hero candidates, ordered by `order`.
- Both `priceMin` and `priceMax` are `null` for **가격 문의 / Ask for pricing**. Set both to positive, ascending KRW integers only when Michelle supplies prices. Omitted bounds also default to inquiry pricing.
- Add real post links in `reviews`: `[{"label":{"ko":"착용 후기","en":"Worn in real life"},"url":"https://www.instagram.com/p/POST_ID/"}]`. Replace the example URL with a verified post. Only HTTPS Instagram/Threads URLs are allowed. Empty lists show an honest profile fallback.
- Photo paths are relative to the repository (`assets/designs/example.jpg`), not external URLs. Images are optimized at build time; originals remain unchanged.

The optional [Pages CMS](https://pagescms.org/docs/configuration/content/) configuration lets an editor manage designs, color books, and settings through forms. It is **prepared but not connected**. To activate later, push this repository to the intended GitHub account, connect it in Pages CMS, configure Michelle's collaborator access, and connect a Cloudflare build to that repository. CMS saves create repository changes; the site updates after a successful rebuild. The Docker preview does not include a CMS server.

### Adding Instagram and Threads posts

Each design has a visible **착용 모습 & 관련 게시물** section above the related designs. Provide the design ID (for example, **ML-01**), one or more post share links, and an optional short title. You can send these in chat for the catalog to be updated, or edit the matching file in `src/content/designs/` directly. For example, `minimal-cowl-neck-slip-dress.json` is ML-01; add entries to its `reviews` list:

```json
"reviews": [
  {
    "label": {"ko": "드레이프 드레스 착용 모습", "en": "Cowl-neck dress styling"},
    "url": "https://www.instagram.com/p/REPLACE_WITH_POST_ID/"
  },
  {
    "label": {"ko": "원단과 핏 이야기", "en": "Fabric and fit details"},
    "url": "https://www.threads.com/@michelle1998kr/post/REPLACE_WITH_POST_ID"
  }
]
```

Replace those example URLs with actual post links. Instagram posts/reels and Threads links are supported. Cards use the provided titles, identify the platform automatically, and appear in list order. They link to the original posts; they do not automatically fetch post text or photos. An empty list shows Michelle's clearly labeled profiles while posts are being added. Both profile handles are editable in `src/content/settings.json`. After editing, rebuild with `docker compose up --build -d`.

If Pages CMS is connected later, open **디자인 / Designs**, choose the design, and add entries under **착용 모습 & 관련 게시물 / Instagram & Threads posts**.

## Saved selections and privacy

- Designs, fabric/color choices, quantities, and item notes use versioned **localStorage**, shared by Korean and English pages and synchronized across tabs on the same origin. Ordinary reloads and closing/reopening a browser retain them.
- Measurements use **sessionStorage** for the current tab. Browser session restore can restore that tab's data. The saved-information page can explicitly clear both selections and measurements.
- Storage is browser/profile/origin specific. Instagram's in-app browser and Safari/Chrome may not share it. Clearing site data, private browsing, disabled storage, or browser eviction can remove it. Cookies alone are not the storage mechanism, so lifetime persistence cannot be guaranteed.
- Recovery links preserve design IDs, fabrics, colors, and quantities in a URL fragment. They intentionally exclude notes, measurements, and prices. They are snapshots, not live synchronized carts. Anyone holding a link can see those choices. Restoration is previewed and requires an explicit replace action.
- When storage is blocked, the page shows a warning and offers a recovery link. A browser that allows storage is needed to continue reliably across pages.
- There are no analytics, trackers, third-party embeds, or customer-data requests. Fonts are self-hosted. Proposal images are generated locally; neither their contents nor measurement fields are uploaded by this application.

## Instagram handoff

The destination is `michelle1998kr`. The visitor copies the proposal and opens `https://ig.me/m/michelle1998kr`; a public-profile fallback is always visible. This application does not auto-send, prefill a DM, or claim delivery. Instagram controls login, app opening, and whether the recipient can receive messages.

The primary handoff is a visual PNG proposal. Every item includes its original design thumbnail, silk, quantity, selected color swatch and code, inquiry price, and note. Unconfirmed colors show a neutral question mark and no invented color code. Measurements appear once. The page previews every image before download; customers save and attach all numbered pages in Instagram. Long notes continue onto numbered pages with the design and color repeated for context. Text copy is available as a secondary fallback. Before launch, test the handoff on real iOS and Android phones, including Instagram's in-app browser and logged-out behavior. Desktop browser verification cannot establish native-app behavior.

## Hosting

### GitHub Pages

The public site is deployed at **https://michelle1998kr.github.io/silkML/**, with Korean at `/silkML/ko/` and English at `/silkML/en/`.

`.github/workflows/deploy.yml` runs the tests and production build, then deploys on each push to `main`. It can also be run manually from GitHub Actions. Repository Settings > Pages must use **GitHub Actions** as the source. The build reads the site's origin and base path from GitHub Pages, so page links, language switching, recovery links, public assets, and optimized images use the correct repository prefix.

To build the GitHub version locally:

```sh
SITE_URL=https://michelle1998kr.github.io SITE_BASE=/silkML npm run build
SITE_URL=https://michelle1998kr.github.io SITE_BASE=/silkML npm run preview
```

The regular Docker preview stays at **http://localhost:8080/ko/**. It defaults to the root path and does not need `SITE_BASE`. Saved choices are separate between localhost and the public site's origin. A recovery link from the public site can restore design/color selections in another browser.

### Optional Cloudflare hosting

This is an **Astro static build with small React islands** for interactive forms. No always-on server, database, API key, or paid commerce platform is needed. Docker is for local preview; Cloudflare can serve `dist/` directly.

Cloudflare Workers Static Assets is an alternative deployment target. [Cloudflare's current documentation](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) lists static asset requests as free and unlimited, with no extra charge for asset storage. A custom domain and any future paid services are separate. Check current limits when deploying.

`wrangler.jsonc` is prepared for an assets-only deployment. No Cloudflare deployment or account connection has been set up. When ready to publish deliberately:

```sh
SITE_URL=https://your-real-domain.example npm run build
npx wrangler@4 deploy
```

Replace the example domain with the actual HTTPS domain. The command uses Cloudflare authentication and publishes the site. In Cloudflare's Git build integration, use `npm run build`, set `SITE_URL`, and use `npx wrangler@4 deploy` as the deployment command. Cloudflare Pages is also compatible: build `npm run build`, output `dist`, no adapter or server required.

## Content to confirm before launch

The 14 initial entries use the supplied photos and descriptive working names. Prices intentionally remain **가격 문의**. Both silk types are available for consultation; Michelle must confirm each design/fabric combination.

Suzhou has 23 approximate screen swatches transcribed from `assets/fabrics/suzhou/color-code-3.jpg`, shown as the first chart. The other supplied charts use different numbering in places, so a customer should identify the sheet in their note when referring to those. Ruby has 24 shades from `assets/fabrics/ruby/color-code-0.jpg`, with approximate swatches sampled from the supplied photo and translated color names. The Ruby chart repeats code **16** for black/baby blue and **38** for navy/brown. These retain their printed codes but have distinct internal IDs (`16-black`, `16-baby-blue`, `38-navy`, `38-brown`) so selections and proposals remain separate. Michelle should confirm those duplicated codes. Both fabrics keep a color consultation option. Screen swatches do not recolor the design photo.

Still needed for a public launch: Michelle's confirmation of design names/offerings and color-code mappings, real Instagram/Threads post links per design, the final domain, and a real-device Instagram handoff check. No reviews or prices have been invented.
