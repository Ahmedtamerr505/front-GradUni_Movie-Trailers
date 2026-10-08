// ===== Configuration =====
window.CONFIG = {
  API_BASE: "https://api.kinocheck.de",
  // Optional: paste your KinoCheck API key here to lift the 1000 requests/day limit.
  // Leave empty to use the free, keyless access.
  API_KEY: "",
  DEFAULT_LANG: "en",   // "en" or "de"
  PAGE_SIZE: 12,
  CACHE_MINUTES: 10     // responses are cached in sessionStorage to save your daily quota
};