// ===== UI helpers =====
const UI = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const esc = (s = "") =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const fmtViews = (n) => {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + "M views";
    if (n >= 1e3) return Math.round(n / 1e3) + "K views";
    return n + " views";
  };
  const fmtDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt)
      ? ""
      : dt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };
  const thumb = (v) => v.youtube_thumbnail || v.thumbnail || "";

  // ---- Toast ----
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // ---- Button ripple ----
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".btn");
    if (!b) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  });

  // ---- Scroll reveal ----
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  const observeReveals = () =>
    $$(".reveal:not(.visible)").forEach((el) => io.observe(el));

  // ---- 3D tilt on cards ----
  function tilt(card) {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => (card.style.transform = ""));
  }

  // ---- Cards ----
  function skeletons(grid, n = 8) {
    grid.innerHTML = Array.from(
      { length: n },
      (_, i) =>
        `<div class="sk-card" style="--i:${i}"><div class="sk-img skeleton"></div><div class="sk-body"><div class="skeleton" style="height:16px"></div><div class="skeleton" style="height:12px;width:60%"></div></div></div>`,
    ).join("");
  }

  function card(v, i, onOpen) {
    const el = document.createElement("article");
    el.className = "card";
    el.style.setProperty("--i", i % 12);
    el.tabIndex = 0;
    el.innerHTML = `
      <div class="card-thumb">
        <img alt="${esc(v.title)}" loading="lazy" src="${esc(thumb(v))}" />
        <span class="badge">${esc((v.categories || ["Video"])[0])}</span>
        <span class="play"></span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${esc(v.title)}</h3>
        <div class="card-meta"><span>${fmtDate(v.published)}</span><span>${fmtViews(v.views)}</span></div>
      </div>`;
    const img = $("img", el);
    img.addEventListener("load", () => img.classList.add("loaded"));
    img.addEventListener("error", () => {
      if (v.thumbnail && img.src !== v.thumbnail) img.src = v.thumbnail;
      else img.classList.add("loaded");
    });
    el.addEventListener("click", () => onOpen(v));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onOpen(v);
    });
    tilt(el);
    return el;
  }

  // ---- Modal ----
  const modal = $("#modal");
  function openModal(v, { related = [], onRelated } = {}) {
    $("#player").innerHTML =
      `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube_video_id)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    $("#modalTitle").textContent = v.title;
    $("#modalMeta").innerHTML = [
      (v.categories || []).join(", "),
      (v.language || "").toUpperCase(),
      fmtDate(v.published),
      fmtViews(v.views),
    ]
      .filter(Boolean)
      .map((t) => `<span>${esc(t)}</span>`)
      .join("");
    $("#modalActions").innerHTML = `
      ${v.url ? `<a class="btn btn-primary" href="${esc(v.url)}" target="_blank" rel="noopener">Open on KinoCheck ↗</a>` : ""}
      <button class="btn btn-ghost" id="copyLink">🔗 Copy link</button>`;
    $("#copyLink").onclick = () => {
      navigator.clipboard
        ?.writeText(v.url || `https://youtu.be/${v.youtube_video_id}`)
        .then(() => toast("Link copied!"));
    };

    const rel = $("#related"),
      list = $("#relatedList");
    rel.hidden = !related.length;
    list.innerHTML = "";
    related.forEach((r) => {
      const d = document.createElement("div");
      d.className = "related-item";
      d.innerHTML = `<img loading="lazy" alt="" src="${esc(thumb(r))}" /><p>${esc(r.title)}</p>`;
      d.onclick = () => onRelated && onRelated(r);
      list.appendChild(d);
    });

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".modal-dialog").scrollTop = 0;
  }
  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    setTimeout(() => ($("#player").innerHTML = ""), 400); // stops the video
  }
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ---- Sliding pill indicators (tabs + language) ----
  function movePill(container, pill, activeSel) {
    const a = $(activeSel, container);
    if (!a) return;
    pill.style.width = a.offsetWidth + "px";
    pill.style.transform = `translateX(${a.offsetLeft - 4}px)`;
  }

  // ---- Scroll effects + cursor glow ----
  function initScrollFx() {
    const header = $("#header"),
      bar = $("#scrollProgress"),
      glow = $("#cursorGlow");
    const onScroll = () => {
      header.classList.toggle("scrolled", scrollY > 40);
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
      const bg = $("#heroBg");
      if (bg && scrollY < innerHeight)
        bg.style.marginTop = scrollY * 0.25 + "px";
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    addEventListener("mousemove", (e) => {
      glow.style.opacity = 1;
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
    });
  }

  return {
    $,
    $$,
    esc,
    toast,
    skeletons,
    card,
    openModal,
    closeModal,
    movePill,
    observeReveals,
    initScrollFx,
    fmtViews,
    fmtDate,
    thumb,
  };
})();
