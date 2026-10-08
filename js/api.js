// ===== KinoCheck API wrapper =====
const API = (() => {
  const { API_BASE, API_KEY, CACHE_MINUTES } = window.CONFIG;

  async function request(path, params = {}) {
    const url = new URL(API_BASE + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });

    // Session cache (protects the 1000 requests/day limit)
    const key = "kc:" + url.toString();
    try {
      const hit = JSON.parse(sessionStorage.getItem(key) || "null");
      if (hit && Date.now() - hit.t < CACHE_MINUTES * 60000) return hit.d;
    } catch (_) {}

    const headers = { Accept: "application/json" };
    if (API_KEY) {
      headers["X-Api-Key"] = API_KEY;
      headers["X-Api-Host"] = "api.kinocheck.de";
    }

    const res = await fetch(url, { headers });
    if (res.status === 429)
      throw new Error(
        "Daily request limit reached. Add an API key in js/config.js.",
      );
    if (res.status === 404) throw new Error("Nothing found for that ID.");
    if (!res.ok) throw new Error(`API error (${res.status}).`);
    const data = await res.json();

    const isEmpty = Array.isArray(data)
      ? data.length === 0
      : !data || Object.keys(data).length === 0;
    if (!isEmpty) {
      try {
        sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }));
      } catch (_) {}
    }
    return data;
  }

  // The list endpoints return videos (array or wrapped); normalise both shapes.
  function toList(res) {
    console.log("[CineWave] raw API response:", res);
    if (Array.isArray(res)) return { items: res, meta: null };
    const meta = (res && res._metadata) || null;
    // Known keys first, then fall back to the first array of objects found anywhere in the response
    let items =
      res &&
      (res.videos || res.trailers || res.data || res.items || res.results);
    if (!Array.isArray(items) && res && typeof res === "object") {
      // KinoCheck's list endpoints return numbered keys: { "0": {...}, "1": {...}, _metadata: {...} }
      const numbered = Object.keys(res)
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => a - b)
        .map((k) => res[k]);
      if (numbered.length) items = numbered;
    }
    if (!Array.isArray(items)) {
      const find = (o) => {
        if (!o || typeof o !== "object") return null;
        for (const v of Object.values(o)) {
          if (Array.isArray(v) && v.length && typeof v[0] === "object")
            return v;
        }
        for (const v of Object.values(o)) {
          const f = find(v);
          if (f) return f;
        }
        return null;
      };
      items = find(res) || [];
    }
    // Some responses may wrap each video, e.g. { video: {...} }
    items = items.map((x) =>
      x && x.video && typeof x.video === "object" ? x.video : x,
    );
    return { items, meta };
  }

  async function searchTitles(query, type, language) {
    const url = new URL("/api/search", window.location.origin);
    url.searchParams.set("query", query);
    url.searchParams.set("type", type);
    url.searchParams.set("language", language === "de" ? "de-DE" : "en-US");

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Title search failed (${response.status}).`);
    }
    return Array.isArray(data.results) ? data.results.slice(0, 8) : [];
  }

  return {
    async trailers({ mode = "trending", genres, language, page = 1, limit }) {
      const path =
        mode === "latest" ? "/trailers/latest" : "/trailers/trending";
      return toList(await request(path, { genres, language, page, limit }));
    },
    searchTitles,
    // Look up a movie/show by TMDB, IMDb or KinoCheck ID
    async entity(type, rawId, language, categories) {
      const id = String(rawId).trim();
      const p = { language, categories };
      if (/^tt\d+$/i.test(id)) p.imdb_id = id.toLowerCase();
      else if (/^\d+$/.test(id)) p.tmdb_id = id;
      else p.id = id;
      const data = await request(`/${type}`, p);
      console.log(`[CineWave] raw ${type} response:`, data);
      // Normalise array-like fields (the API may return numbered-key objects instead of arrays)
      const asArray = (x) => {
        if (Array.isArray(x)) return x;
        if (x && typeof x === "object") {
          const keys = Object.keys(x)
            .filter((k) => /^\d+$/.test(k))
            .sort((a, b) => a - b);
          return keys.map((k) => x[k]);
        }
        return [];
      };
      return {
        ...data,
        videos: asArray(data.videos),
        recommendations: asArray(data.recommendations),
      };
    },
  };
})();
