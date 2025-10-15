import React, { useMemo, useState } from "react";
import "./App.css";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const IMG_BASE = "https://image.tmdb.org/t/p/";
const IMG_SIZE = "w342";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const languageDisplay = useMemo(() => {
    try {
      return new Intl.DisplayNames(["it"], { type: "language" });
    } catch {
      return null;
    }
  }, []);

  const lookupLang = (code) => {
    if (!code) return "-";
    if (languageDisplay) {
      try {
        const name = languageDisplay.of(code);
        if (name) return name.charAt(0).toUpperCase() + name.slice(1);
      } catch { }
    }
    return code.toUpperCase();
  };

  const posterUrl = (path) => (path ? `${IMG_BASE}${IMG_SIZE}${path}` : null);

  const starsFromVote = (v) => {
    if (typeof v !== "number" || Number.isNaN(v)) return 1;
    return Math.min(5, Math.max(1, Math.ceil(v / 2)));
  };

  const normalizeResult = (item) => {
    if (!item) return null;
    if (item.media_type !== "movie" && item.media_type !== "tv") return null;

    if (item.media_type === "movie") {
      return {
        id: `movie_${item.id}`,
        kind: "movie",
        title: item.title || item.original_title || "—",
        original_title: item.original_title || item.title || "—",
        original_language: item.original_language || null,
        vote_average:
          typeof item.vote_average === "number" ? item.vote_average : null,
        poster_path: item.poster_path || null,
        overview: item.overview || "",
      };
    }

    return {
      id: `tv_${item.id}`,
      kind: "tv",
      title: item.name || item.original_name || "—",
      original_title: item.original_name || item.name || "—",
      original_language: item.original_language || null,
      vote_average:
        typeof item.vote_average === "number" ? item.vote_average : null,
      poster_path: item.poster_path || null,
      overview: item.overview || "",
    };
  };

  const search = async () => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setStatus("idle");
      setError("");
      return;
    }
    if (!API_KEY) {
      setStatus("error");
      setError("API key mancante. Imposta VITE_TMDB_API_KEY nel file .env.");
      return;
    }
    setStatus("loading");
    setError("");
    setResults([]);

    try {
      const url = new URL("https://api.themoviedb.org/3/search/multi");
      url.searchParams.set("api_key", API_KEY);
      url.searchParams.set("query", q);
      url.searchParams.set("include_adult", "false");
      url.searchParams.set("language", "it-IT");

      const res = await fetch(url);
      if (!res.ok) throw new Error(`TMDB ha risposto ${res.status}`);
      const data = await res.json();

      const normalized = (Array.isArray(data.results) ? data.results : [])
        .map(normalizeResult)
        .filter(Boolean);

      setResults(normalized);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Errore di rete");
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    search();
  };

  return (
    <div className="app">
      <header className="bf-header">
        <div className="bf-brand">BOOLFLIX</div>
        <form className="bf-search" onSubmit={onSubmit}>
          <input
            type="search"
            placeholder="Cerca un titolo (film o serie)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cerca film o serie"
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Cerco..." : "Cerca"}
          </button>
        </form>
      </header>

      <main className="container">
        {status === "error" && <div className="alert error">{error}</div>}
        {status === "success" && (
          <div className="meta" aria-live="polite">
            {results.length > 0 ? (
              <span>Trovati {results.length} risultati (film + serie)</span>
            ) : (
              <span>Nessun risultato</span>
            )}
          </div>
        )}

        <section className="bf-grid">
          {results.map((m) => {
            const bg = posterUrl(m.poster_path);
            const stars = starsFromVote(m.vote_average);

            return (
              <article
                key={m.id}
                className={`bf-card ${bg ? "" : "no-bg"}`}
                style={bg ? { backgroundImage: `url(${bg})` } : undefined}
                tabIndex={0}
              >
                <div className="bf-cardShade" aria-hidden />

                <div className="bf-overlay">
                  <h3 className="bf-title">
                    {m.title}{" "}
                    <span className="bf-kind">
                      ({m.kind === "movie" ? "Film" : "Serie"})
                    </span>
                  </h3>

                  <dl className="bf-details">
                    <div>
                      <dt>Titolo originale</dt>
                      <dd>{m.original_title || "—"}</dd>
                    </div>
                    <div>
                      <dt>Lingua</dt>
                      <dd>{lookupLang(m.original_language)}</dd>
                    </div>
                  </dl>

                  <div className="bf-stars" aria-label={`${stars} su 5 stelle`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i
                        key={i}
                        className={
                          i < stars
                            ? "fa-solid fa-star bf-star filled"
                            : "fa-regular fa-star bf-star"
                        }
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  {m.overview && <p className="bf-overview">{m.overview}</p>}
                </div>


                {!bg && (
                  <div className="bf-cardPlaceholder">Nessun poster</div>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
