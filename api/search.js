module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const query = String(req.query.query || "").trim();
  const type = req.query.type === "shows" ? "shows" : "movies";
  const language = req.query.language === "de-DE" ? "de-DE" : "en-US";
  const apiKey = process.env.TMDB_API_KEY;

  if (!query || query.length > 120) {
    return res.status(400).json({ error: "Enter a title under 120 characters." });
  }
  if (!apiKey) {
    return res.status(500).json({ error: "Title search is not configured on the server." });
  }

  const endpoint = type === "shows" ? "/search/tv" : "/search/movie";
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("language", language);
  url.searchParams.set("page", "1");

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      console.error("TMDB title search failed with status", response.status);
      return res.status(502).json({ error: "The title search provider could not complete the request." });
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results.slice(0, 8) : [];
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ results });
  } catch (error) {
    console.error("TMDB title search request failed", error);
    return res.status(502).json({ error: "Unable to reach the title search provider." });
  }
};
