# 🎬 PopChoice

PopChoice is an AI-powered movie recommendation system that combines Retrieval-Augmented Generation (RAG), semantic search, and The Movie Database (TMDB) API to recommend movies tailored to a user's preferences.

Instead of relying solely on keyword matching, PopChoice understands the semantic meaning behind a user's favorite movie, preferred era, and desired mood to recommend the most relevant films.

---

## ✨ Features

- 🤖 AI-powered movie recommendations using OpenAI GPT
- 🔎 Semantic search with OpenAI Embeddings
- 📚 Retrieval-Augmented Generation (RAG)
- 🗂️ Vector database using Supabase pgvector
- 🎞️ TMDB API fallback when no suitable movie exists in the local database
- 🎨 Responsive and modern UI with animated background
- 🖼️ Movie posters and detailed recommendation cards
- 🎠 Carousel interface for multiple recommendations

---

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Vite

### Backend

- Node.js
- Express.js

### AI & APIs

- OpenAI GPT-4.1 Mini
- OpenAI Embeddings (text-embedding-3-small)
- Supabase
- pgvector
- The Movie Database (TMDB) API

---

## 📂 Project Structure

```
PopChoice/
│
├── images/
│   └── popcorn.png
│
├── server/
│   └── server.js
│
├── index.html
├── index.css
├── index.js
├── content.js
├── seed.js
├── vite.config.js
├── package.json
├── .env
└── README.md
```

---

## ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/yourusername/PopChoice.git

cd PopChoice
```

Install dependencies

```bash
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root.

```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_API_KEY=your_supabase_service_role_key
TMDB_API_KEY=your_tmdb_api_key
```

---

## 🚀 Running the Project

Start the backend

```bash
npm run server
```

Start the frontend

```bash
npm run dev
```

Open

```
http://localhost:5173
```

---

## 🧠 Recommendation Workflow

1. User enters:
   - Favorite movie
   - Preferred movie era
   - Desired mood
2. OpenAI generates an embedding from the user's preferences.
3. Supabase pgvector performs semantic similarity search.
4. If a sufficiently similar movie exists:
   - RAG context is built from the local movie database.
5. Otherwise:
   - TMDB is searched for relevant movies.
   - Movie information is used as context.
6. GPT analyzes the retrieved context and generates personalized recommendations.
7. The frontend displays the recommendations with posters and descriptions.

---

## Future Improvements

- User authentication
- Save favorite movies
- Genre and language filters
- Watchlist functionality
- Streaming platform availability
- Recommendation history
- Voice input
- Advanced AI personalization
