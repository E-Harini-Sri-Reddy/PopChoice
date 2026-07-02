import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* ===================================================
                SERVE FRONTEND
=================================================== */

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

const PORT = process.env.PORT || 3001;

/* ===================================================
                    OPENAI
=================================================== */

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing.");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ===================================================
                    SUPABASE
=================================================== */

if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL missing.");

if (!process.env.SUPABASE_API_KEY) throw new Error("SUPABASE_API_KEY missing.");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY,
);

/* ===================================================
                    TMDB
=================================================== */

if (!process.env.TMDB_API_KEY) throw new Error("TMDB_API_KEY missing.");

const TMDB_KEY = process.env.TMDB_API_KEY;

const TMDB_BASE = "https://api.themoviedb.org/3";

/* ===================================================
                CREATE EMBEDDING
=================================================== */

async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " "),
  });

  return response.data[0].embedding;
}

/* ===================================================
                BUILD USER PROMPT
=================================================== */

function buildPrompt(favoriteMovie, movieEra, movieMood) {
  return `
Favorite movie/TV Show:
${favoriteMovie}

Preferred era:
${movieEra}

Preferred mood:
${movieMood}
`;
}

/* ===================================================
            SEARCH VECTOR DATABASE
=================================================== */

async function findMatchingMovies(userPrompt) {
  console.log("Creating embedding...");

  const embedding = await createEmbedding(userPrompt);

  console.log("Embedding created.");

  console.log("Calling match_movies...");

  const { data, error } = await supabase.rpc("match_movies", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5,
  });

  console.log("RPC finished.");

  console.log(data);

  if (error) throw error;

  return data ?? [];
}

/* ===================================================
            BUILD VECTOR CONTEXT
=================================================== */

function buildMovieContext(matches) {
  return matches
    .map(
      (movie) => `

Title: ${movie.title}

Release Year: ${movie.release_year}

${movie.content}

Similarity:
${movie.similarity.toFixed(3)}

`,
    )
    .join("\n-------------------------\n");
}

/* ===================================================
                TMDB SEARCH
=================================================== */

async function searchTMDB(query) {
  console.log("\n======================");
  console.log("Searching TMDB");
  console.log("Query:", query);

  try {
    const response = await axios.get(`${TMDB_BASE}/search/multi`, {
      params: {
        api_key: TMDB_KEY,
        query,
        include_adult: false,
      },
    });

    console.log("Status:", response.status);
    console.log("Total results:", response.data.results.length);

    response.data.results.forEach((item) => {
      console.log({
        title: item.title || item.name,
        mediaType: item.media_type,
        poster: item.poster_path,
      });
    });

    return response.data.results.filter(
      (item) => item.media_type === "movie" || item.media_type === "tv",
    );
  } catch (err) {
    console.error("TMDB ERROR");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error(err.response.data);
    } else {
      console.error(err.message);
    }

    return [];
  }
}

/* ===================================================
            ATTACH TMDB POSTERS
=================================================== */

async function attachPosters(movies) {
  const updated = [];

  for (const movie of movies) {
    try {
      const query = movie.title;

      console.log("\nLooking up:", query);

      const results = await searchTMDB(query);

      let poster = "";

      const exactMatch = results.find((result) => {
        const title = result.title || result.name || "";

        return (
          title.toLowerCase() === movie.title.toLowerCase() &&
          result.poster_path
        );
      });

      if (exactMatch) {
        poster = `https://image.tmdb.org/t/p/w500${exactMatch.poster_path}`;
      } else {
        const firstWithPoster = results.find((result) => result.poster_path);

        if (firstWithPoster) {
          poster = `https://image.tmdb.org/t/p/w500${firstWithPoster.poster_path}`;
        }
      }

      console.log("Poster:", poster);

      updated.push({
        ...movie,
        poster,
      });

      // Small delay so we don't hammer TMDB
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (err) {
      console.error("Poster lookup failed:", movie.title, err.message);

      updated.push({
        ...movie,
        poster: "",
      });
    }
  }

  return updated;
}

/* ===================================================
            BUILD TMDB CONTEXT
=================================================== */

function buildTMDBContext(results) {
  return results
    .map(
      (movie) => `

Title:
${movie.title}

Release Year:
${movie.release_date?.split("-")[0]}

Rating:
${movie.vote_average}

Poster:
${
  movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : ""
}

Overview:
${movie.overview}

`,
    )
    .join("\n---------------------------\n");
}

/* ===================================================
        DETERMINE DATA SOURCE
=================================================== */

async function buildRecommendationContext(userPrompt, favoriteMovie) {
  const matches = await findMatchingMovies(userPrompt);

  if (matches.length) {
    const bestScore = matches[0].similarity;

    console.log("Best vector similarity:", bestScore);

    /*
            If similarity is good enough,
            use our RAG database.
        */

    if (bestScore >= 0.65) {
      return {
        source: "database",
        context: buildMovieContext(matches),
      };
    }
  }

  /*
        Otherwise search TMDB.
    */

  const tmdbMovies = await searchTMDB(favoriteMovie);

  if (!tmdbMovies.length) {
    return {
      source: "fallback",
      context:
        "No external results available. Provide a generic recommendation.",
    };
  }

  return {
    source: "tmdb",

    context: buildTMDBContext(tmdbMovies),
  };
}

/* ===================================================
        BUILD GPT PROMPT
=================================================== */

function buildRecommendationPrompt(userPrompt, context, source) {
  return `
You are PopChoice, an expert AI movie and TV Show recommendation assistant.

A user is looking for a movie/TV Show.

Their preferences are:

${userPrompt}

The following information came from ${
    source === "database"
      ? "our curated movie database."
      : "The Movie Database (TMDB)."
  }

${context}

Your task:

1. Carefully analyse every candidate movie.

2. Choose exactly 5 diverse movies or TV Shows that match the user preferences.

3. Explain why it best matches the user's preferences.

- Description must be max 2 paragraphs, concise.

4. Never mention:
- embeddings
- vectors
- semantic search
- databases
- retrieval
- TMDB

Example:

{
    "title":"Interstellar",
    "year":"2014",
    "rating":"8.7",
    "description":"Two engaging paragraphs."
}
`;
}

/* ===================================================
            ASK GPT
=================================================== */

async function askGPT(prompt) {
  console.log("Generating recommendation using GPT...");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `
You are PopChoice.

Return ONLY valid JSON.

STRICT OUTPUT FORMAT:
{
  "movies": [
    {
      "title": "string",
      "year": "string",
      "rating": "string",
      "description": "string"
    }
  ]
}

RULES:
- EXACTLY 5 movies or TV Shows
- MUST be inside "movies" array
- NO extra keys
- NO markdown
- NO explanation
- NO text outside JSON
`,
      },
      { role: "user", content: prompt },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

/* ===================================================
                API
=================================================== */

app.post("/recommend", async (req, res) => {
  try {
    const { favoriteMovie, movieEra, movieMood } = req.body;

    if (!favoriteMovie || !movieEra || !movieMood) {
      return res.status(400).json({
        error: "Missing required fields.",
      });
    }

    console.log("\n==============================");
    console.log("New Recommendation Request");
    console.log("==============================");

    const userPrompt = buildPrompt(favoriteMovie, movieEra, movieMood);

    const recommendationContext = await buildRecommendationContext(
      userPrompt,
      favoriteMovie,
    );

    console.log("Recommendation source:", recommendationContext.source);

    const prompt = buildRecommendationPrompt(
      userPrompt,
      recommendationContext.context,
      recommendationContext.source,
    );

    const recommendation = await askGPT(prompt);

    if (!recommendation || !Array.isArray(recommendation.movies)) {
      console.error("Invalid GPT output:", recommendation);

      return res.status(500).json({
        error: "Invalid recommendation format from GPT",
      });
    }

    /* Attach TMDB posters */
    recommendation.movies = await attachPosters(recommendation.movies);

    res.json({
      source: recommendationContext.source,
      movies: recommendation.movies,
    });
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);

    if (error.stack) {
      console.error(error.stack);
    }

    res.status(500).json({
      error: error.message,
    });
  }
});

/* ===================================================
                HEALTH CHECK
=================================================== */

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

/* ===================================================
                SERVE FRONTEND
=================================================== */

app.use(express.static(path.join(__dirname, "../dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

/* ===================================================
                START SERVER
=================================================== */

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("🎬 PopChoice Server Running");
  console.log("======================================");
  console.log(`Listening on http://localhost:${PORT}`);
  console.log("");
});
