# 🎬 CineWave

**Discover trending and latest official movie and TV trailers, powered by the free [KinoCheck API](https://api.kinocheck.de).**

CineWave is a fast, dependency-free web app built with plain HTML, CSS and JavaScript. It features an animated film-reel loader, a cinematic hero banner, genre filters, an in-page trailer player and search by TMDB / IMDb / KinoCheck ID.

## ✨ Features

- 🎞️ **Animated film-reel loader** with progress bar and smooth exit
- 🔥 **Trending** and 🆕 **Latest** trailers with **genre filters** and *Load more* pagination
- 🌍 **English / German** switch (remembered between visits)
- ▶️ **Trailer popup** with a privacy-friendly YouTube player and "more videos for this title"
- 🔎 **Search by ID** for movies and shows (TMDB, IMDb or KinoCheck ID)
- 🎨 **Polished UX:** Ken Burns hero, parallax, 3D tilt cards, shimmer skeletons, scroll reveal, button ripples, scroll progress bar, cursor glow
- ♿ Respects `prefers-reduced-motion`; keyboard friendly; responsive down to mobile
- ⚡ Session cache to save your daily API quota

## 🗂️ Project structure

```
cinewave/
├── index.html
├── README.md
├── docs/                 # screenshots
├── css/
│   ├── style.css         # layout, colors, components
│   ├── loader.css        # animated film-reel loader
│   └── animations.css    # keyframes, scroll reveal, card entrance
└── js/
    ├── config.js         # API key, default language, page size
    ├── api.js            # KinoCheck fetch wrapper + cache + response normalising
    ├── ui.js             # cards, modal, tilt, ripple, toast, scroll effects
    └── app.js            # app logic: tabs, genres, search, language, hero
```

## 🚀 Getting started

No build step or dependencies are needed. Serve the folder with any static server (opening `index.html` by double-click is not recommended):

```bash
git clone https://github.com/<your-username>/cinewave.git
cd cinewave
python3 -m http.server 5500
# open http://localhost:5500
```

Or use the **Live Server** extension in VS Code.

## ⚙️ Configuration

Edit `js/config.js`:

| Option | Default | Description |
| --- | --- | --- |
| `API_KEY` | `""` | Optional KinoCheck API key to lift the 1000 requests/day limit |
| `PAGE_SIZE` | `12` | Trailers per page |
| `CACHE_MINUTES` | `10` | How long responses are cached in `sessionStorage` |

> ⚠️ An API key in front-end code is visible to every visitor. For a public site, route requests through a small proxy (e.g. a Cloudflare Worker) and keep the key there.

## 🔌 API endpoints used

| Endpoint | Used for |
| --- | --- |
| `GET /trailers/trending` | Trending tab and hero |
| `GET /trailers/latest` | Latest tab |
| `GET /movies?tmdb_id= / imdb_id= / id=` | Search and related videos |
| `GET /shows?...` | Search for TV shows |

Note: the list endpoints return the videos as numbered keys (`{"0": {...}, "1": {...}, "_metadata": {...}}`) rather than a plain array. `js/api.js` normalises this.

## 🛠️ Troubleshooting

- **Empty grid:** open the browser console (F12). Every API response is logged as `[CineWave] raw API response`.
- **Limit reached (429):** wait until tomorrow, or add an API key.
- **CORS error:** call the API through a proxy and point `API_BASE` in `config.js` to it.

## 📄 Credits & license

Video data and metadata by [KinoCheck](https://api.kinocheck.de). All trademarks and videos belong to their respective owners.
Code released under the MIT License.
