// ===== App logic =====
(() => {
  const { $, $$, esc } = UI;
  const CFG = window.CONFIG;

  const GENRES = [
    "All",
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Science Fiction",
    "Thriller",
    "Superhero",
    "Sci-Fi & Fantasy",
    "Kids",
  ];

  const state = {
    mode: "trending",
    genre: "",
    lang: CFG.DEFAULT_LANG,
    page: 1,
    totalPages: 1,
    loading: false,
  };

  // ---------- Loader ----------
  const loaderFill = $("#loaderFill"),
    loaderText = $("#loaderText");
  const setProgress = (p, t) => {
    loaderFill.style.width = p + "%";
    if (t) loaderText.textContent = t;
  };
  function hideLoader() {
    setProgress(100, "Action!");
    setTimeout(() => {
      $("#loader").classList.add("done");
      document.body.classList.remove("is-loading");
      UI.observeReveals();
    }, 600);
  }

  // ---------- Hero ----------
  function renderHero(v) {
    $("#heroBg").style.backgroundImage = `url("${UI.thumb(v)}")`;
    const c = $("#heroContent");
    c.innerHTML = `
      <span class="hero-badge"><i></i> ${state.mode === "latest" ? "Just released" : "Trending now"}</span>
      <h1 class="hero-title">${esc(v.title)}</h1>
      <div class="hero-meta"><span>${esc((v.categories || []).join(" • "))}</span><span>${UI.fmtDate(v.published)}</span><span>${UI.fmtViews(v.views)}</span></div>
      <div class="hero-actions">
        <button class="btn btn-primary" id="heroPlay">▶ Watch trailer</button>
        <a class="btn btn-ghost" href="#browse">Browse more</a>
      </div>`;
    c.classList.add("ready");
    $("#heroPlay").onclick = () => openVideo(v);
  }

  // ---------- Related videos + modal ----------
  async function openVideo(v) {
    UI.openModal(v, { onRelated: openVideo });
    if (v.resource && v.resource.id) {
      try {
        const type =
          (v.resource.path || "/movies/").replace(/\//g, "") || "movies";
        const res = await API.entity(type, v.resource.id, state.lang);
        const related = (res.videos || [])
          .filter((x) => x.id !== v.id)
          .slice(0, 8);
        if ($("#modal").classList.contains("open") && related.length)
          UI.openModal(v, { related, onRelated: openVideo });
      } catch (_) {
        /* related videos are optional */
      }
    }
  }

  // ---------- Grid ----------
  async function loadGrid(append = false) {
    if (state.loading) return;
    state.loading = true;
    const grid = $("#grid"),
      more = $("#loadMore"),
      empty = $("#empty");
    empty.hidden = true;
    if (!append) {
      state.page = 1;
      UI.skeletons(grid, 8);
      more.hidden = true;
    }

    try {
      const { items, meta } = await API.trailers({
        mode: state.mode,
        genres: state.genre,
        language: state.lang,
        page: state.page,
        limit: CFG.PAGE_SIZE,
      });
      state.totalPages = meta ? meta.total_pages : 1;
      if (!append) grid.innerHTML = "";
      const start = grid.children.length;
      items.forEach((v, i) => grid.appendChild(UI.card(v, i, openVideo)));
      empty.hidden = grid.children.length > 0;
      more.hidden = state.page >= state.totalPages || items.length === 0;
      return items;
    } catch (err) {
      if (!append) grid.innerHTML = "";
      grid.innerHTML = `<div class="error-box" style="grid-column:1/-1">⚠️ ${esc(err.message)} — if this keeps happening open the browser console (F12) and check for a CORS error (see README).</div>`;
      UI.toast(err.message);
    } finally {
      state.loading = false;
    }
  }

  // ---------- Tabs / chips / language ----------
  function initTabs() {
    const tabs = $("#tabs"),
      pill = $(".tab-indicator");
    const sync = () => UI.movePill(tabs, pill, ".tab.active");
    sync();
    addEventListener("resize", sync);
    $$(".tab", tabs).forEach(
      (t) =>
        (t.onclick = () => {
          if (t.dataset.mode === state.mode) return;
          $$(".tab", tabs).forEach((x) =>
            x.classList.toggle("active", x === t),
          );
          state.mode = t.dataset.mode;
          sync();
          loadGrid();
        }),
    );
  }

  function initChips() {
    const wrap = $("#chips");
    wrap.innerHTML = GENRES.map(
      (g, i) =>
        `<button class="chip${i === 0 ? " active" : ""}" data-g="${i === 0 ? "" : esc(g)}">${esc(g)}</button>`,
    ).join("");
    wrap.onclick = (e) => {
      const c = e.target.closest(".chip");
      if (!c) return;
      $$(".chip", wrap).forEach((x) => x.classList.toggle("active", x === c));
      state.genre = c.dataset.g;
      loadGrid();
    };
  }

  function initTheme() {
    const button = $("#themeToggle");
    const savedTheme = localStorage.getItem("cw-theme");
    const setTheme = (theme) => {
      const isLight = theme === "light";
      document.documentElement.dataset.theme = isLight ? "light" : "dark";
      button.querySelector("span").textContent = isLight ? "🌙" : "☀️";
      button.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} mode`);
      button.title = `Switch to ${isLight ? "dark" : "light"} mode`;
      button.setAttribute("aria-pressed", String(isLight));
    };

    setTheme(savedTheme === "light" ? "light" : "dark");
    button.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      localStorage.setItem("cw-theme", nextTheme);
      setTheme(nextTheme);
    });
  }

  // ---------- Search by title ----------
  function initSearch() {
    const out = $("#searchResult");
    $("#searchForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const type = $("#searchType").value,
        query = $("#searchInput").value.trim();
      out.innerHTML = `<p class="muted">Searching titles…</p>`;
      try {
        const results = await API.searchTitles(query, type, state.lang);
        if (!results.length) {
          out.innerHTML = `<div class="error-box">No matching titles found. Try a different spelling.</div>`;
          return;
        }
        out.innerHTML = results.map((item) => {
          const title = type === "shows" ? item.name : item.title;
          const date = type === "shows" ? item.first_air_date : item.release_date;
          const year = date ? date.slice(0, 4) : "";
          return `<article class="title-result">
            <div><h3>${esc(title || "Untitled")}${year ? ` <span>(${esc(year)})</span>` : ""}</h3>
            <p>${esc(item.overview || "No description available.")}</p></div>
            <button class="btn btn-ghost title-trailers" type="button" data-id="${Number(item.id)}" data-type="${type}">Show trailers</button>
            <div class="title-videos"></div>
          </article>`;
        }).join("");
        out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        out.innerHTML = `<div class="error-box">⚠️ ${esc(err.message)}</div>`;
      }
    });

    out.addEventListener("click", async (e) => {
      const button = e.target.closest(".title-trailers");
      if (!button || button.disabled) return;
      const panel = button.closest(".title-result").querySelector(".title-videos");
      button.disabled = true;
      button.textContent = "Loading…";
      panel.innerHTML = `<p class="muted">Loading available trailers…</p>`;
      try {
        const entity = await API.entity(button.dataset.type, button.dataset.id, state.lang);
        const videos = entity.videos.length ? entity.videos : entity.trailer ? [entity.trailer] : [];
        if (!videos.length) {
          panel.innerHTML = `<div class="error-box">No KinoCheck trailers are available for this title yet.</div>`;
        } else {
          panel.innerHTML = `<div class="grid" id="titleVideoGrid"></div>`;
          const grid = panel.querySelector(".grid");
          videos.forEach((video, i) => grid.appendChild(UI.card(video, i, openVideo)));
        }
        button.textContent = "Trailers loaded";
      } catch (err) {
        panel.innerHTML = `<div class="error-box">⚠️ ${esc(err.message)}</div>`;
        button.disabled = false;
        button.textContent = "Try again";
      }
    });
  }

  // ---------- Boot ----------
  async function boot() {
    const t0 = Date.now();
    setProgress(15, "Rolling the film…");
    UI.initScrollFx();
    initTabs();
    initChips();
    initTheme();
    initSearch();
    $("#loadMore").onclick = () => {
      state.page++;
      loadGrid(true);
    };
    UI.observeReveals();

    setProgress(45, "Fetching trailers…");
    const items = await loadGrid();
    setProgress(85, "Setting the stage…");
    if (items && items.length)
      renderHero(items.find((v) => UI.thumb(v)) || items[0]);
    else
      $("#heroContent").innerHTML =
        `<h1 class="hero-title">CineWave</h1><p class="muted">Official trailers, one click away.</p>`;

    // Keep the loader on screen for at least 1.6s so the animation can be enjoyed
    setTimeout(hideLoader, Math.max(0, 1600 - (Date.now() - t0)));
  }
  boot();
})();
