# Adaptive Tutor Agent

A local, LAN-accessible, multi-user **personal tutor** that teaches, quizzes, detects knowledge gaps, and coaches across **Philosophy, Psychology, AI, Physics, and Coding** — powered entirely by a local [Ollama](https://ollama.com) model. No data leaves your network.

One **host** machine (macOS or Windows) runs the web server, the SQLite database, and Ollama. Other computers on the same local network open the host's address in a browser, pick their own profile, and learn independently. Progress is stored per profile on the host, so a student sees the same mastery from any device.

## How it teaches

- **Adapts to level (ZPD):** every explanation and question is calibrated to the student's estimated mastery and Bloom's-taxonomy level for the current topic.
- **Detects gaps:** answers are graded by the model with structured output; misconceptions are recorded and revisited later.
- **Coaches Socratically:** hints and guiding questions before answers, with growth-mindset encouragement.
- **Grounded (RAG):** explanations are grounded in a local knowledge base so small models stay accurate.

## Prerequisites

1. **Node.js 20+** — https://nodejs.org
2. **Ollama** — https://ollama.com/download
   - macOS: install the app or `brew install ollama`
   - Windows: run the installer
3. Pull the models:

```bash
ollama pull gemma4:e4b-it-qat  # conversational tutor (QAT, fast on Apple Silicon)
ollama pull nomic-embed-text   # embeddings for RAG grounding
```

You can use any chat model you have pulled (e.g. `gemma4:e4b-it-qat`, `gemma4`, `llama3.2:3b`, `qwen2.5:7b`) by setting `TUTOR_MODEL` in `.env` to the **exact** tag. On a Mac Mini / Apple Silicon, the QAT `gemma4:e4b-it-qat` is markedly faster than the full `gemma4` while keeping good tutoring quality. Note: Gemma is a chat/vision model and cannot produce embeddings, so `nomic-embed-text` (or another embedding model) is still needed for retrieval.

## Quick start (one command + a desktop icon)

After installing **Node 20+** and **Ollama** (above), from the project folder run:

```bash
node scripts/setup.mjs      # macOS, Windows, or Linux
```

This single command: creates `.env`, pulls the configured models, installs dependencies, builds the app, seeds the database, and creates a **double-clickable launcher on your Desktop** ("Adaptive Tutor"):

- **macOS:** an `Adaptive Tutor.app` you can keep in the Dock or drag to `/Applications`.
- **Windows:** an `Adaptive Tutor` desktop shortcut.

From then on, **just double-click the icon**. It makes sure Ollama is running, starts the server, and opens the tutor in your browser automatically. To start it from a terminal instead:

```bash
npm run launch
```

> Want a custom icon? Drop `scripts/AppIcon.icns` (macOS) or `scripts/AppIcon.ico` (Windows) into the repo before running setup and it will be used automatically. You can re-create the launcher anytime with `npm run app:install` (macOS) or `powershell -ExecutionPolicy Bypass -File scripts\install-windows-shortcut.ps1` (Windows).

The manual steps below are equivalent, if you prefer to run them yourself.

## Setup (manual)

```bash
# 1. Install dependencies
npm install

# 2. Create your local config
cp .env.example .env        # macOS/Linux
copy .env.example .env      # Windows (cmd)

# 3. Create the database and seed curriculum + knowledge base
npm run setup               # = db:migrate + seed
```

> The `seed` step embeds the knowledge base with `nomic-embed-text`. If Ollama isn't running yet, seeding still completes — it just stores the text without embeddings and the tutor falls back to topic-matched context. Re-run `npm run seed` later to add embeddings.

## Run

```bash
npm run dev
```

The server binds to `0.0.0.0:3000` so it is reachable across your LAN.

- On the host: open http://localhost:3000
- From other computers: open `http://<host-ip>:3000`

Find the host IP:
- **macOS:** `ipconfig getifaddr en0` (Wi‑Fi) or `en1`
- **Windows:** `ipconfig` → IPv4 Address

On first launch your OS may prompt to allow Node through the firewall — allow it for **private networks**.

The UI is responsive and works on phones and tablets on the same network: the subject/topic sidebar collapses into a tap-to-open menu (☰) on small screens, while PCs and tablets keep the full two-column layout. Ollama only runs on the host, so mobile devices just need a browser.

For a production-style run:

```bash
npm run build
npm start
```

## Multi-user profiles

- The landing page lists profiles and lets anyone create a new one (name, color, optional 4–8 digit PIN).
- The PIN is a lightweight guard against accidental cross-use on a **trusted** network — it is **not** strong authentication. Don't expose this server to the public internet.
- Each browser stores only a profile id cookie; all learning state lives on the host.

## Admin portal

A designated **admin profile** (e.g. yours) can open `/admin` to oversee everything:

- **Profiles:** every learner with stats (subjects touched, topics mastered, average mastery, attempts, open gaps, last active) and a drill-down into per-topic mastery and gaps.
- **Curriculum:** rename/edit subjects (description, teaching framing, order), edit topics (name, description, order, prerequisites), and delete topics or whole subjects.
- **Knowledge:** inspect ingested sources and knowledge chunks per subject/topic, delete bad content, and re-embed a source whose chunks are missing embeddings.

**Granting admin:** create your profile in the app (give it a PIN so the portal isn't open to anyone), then run:

```bash
npm run admin:grant -- "Mike"     # use your profile's exact name
npm run admin:grant -- --list     # show current admins
npm run admin:grant -- --revoke "Mike"
```

Once granted, an **Admin** button appears in the learning header. Access is gated by being signed in as that admin profile (its PIN is the lock), and every `/api/admin/*` route rejects non-admins.

## Adding subjects & textbooks

Subjects, topics, and the knowledge base are all stored in the database, so you can grow the curriculum at runtime from the learning UI - no code changes or restarts.

- **Add a subject:** in the sidebar, click **+ Add** next to "Subjects", enter a name (e.g. `Chemistry` - independent of the built-in `Organic Chemistry`), and optionally paste a chapter list/syllabus. The local model drafts a topic path with prerequisites that you can edit (rename, add/remove topics, set prerequisites) before saving. The new subject is shared with all profiles.
- **Teach it new knowledge:** with a subject selected, click **+ Material** above the topic list. You can add knowledge three ways (optionally attached to a specific topic):
  - **PDF** — upload a textbook, notes, or paper.
  - **Paste text** — drop in notes, definitions, or an article directly.
  - **Web URL** — point at a web page; the host fetches it and extracts the readable text.

  In every case the content is chunked and embedded locally (progress shows per source) and the tutor's RAG retrieval uses it on the next turn. Admins can also add text/URL knowledge from **Admin → Knowledge**.

> The model itself is never fine-tuned — new knowledge is added via **retrieval-augmented generation (RAG)**: your material is embedded locally and the most relevant chunks are injected into the tutor's context at answer time. This is instant, needs no GPU training run, and is editable/removable anytime from the admin portal.

PDFs are parsed with [`unpdf`](https://www.npmjs.com/package/unpdf) (pure JS, no native build, works on macOS and Windows). All ingested material stays on the host in SQLite - nothing is uploaded anywhere.

> Embedding a full textbook is many sequential calls to the embedding model, so ingestion runs in the background and the UI polls for status. Retrieval scores chunk similarity in memory, which is fine for a handful of textbooks per subject; for very large libraries you'd add a vector index.

## Configuration (`.env`)

| Variable        | Default                  | Purpose                                  |
| --------------- | ------------------------ | ---------------------------------------- |
| `OLLAMA_HOST`   | `http://127.0.0.1:11434` | Where the host reaches Ollama (local).   |
| `TUTOR_MODEL`   | `gemma4:e4b-it-qat`      | Conversational tutor model (exact tag).  |
| `EMBED_MODEL`   | `nomic-embed-text`       | Embedding model for RAG.                 |
| `HOST` / `PORT` | `0.0.0.0` / `3000`       | Server bind address (LAN access).        |
| `DATABASE_PATH` | `./data/tutor.db`        | SQLite database file (WAL mode).         |

## Project structure

```
app/            Next.js routes + UI (profile landing, /learn tutor, /api/*)
components/     Client UI (MarkdownLite, HealthBadge, ContentModals)
lib/            ollama client, prompts, adaptive engine, RAG, orchestrator, data access,
                chunk (shared splitter), pdf (text extraction), html (URL fetch/extract),
                ingest, curriculum-gen
db/             Drizzle schema, connection, curriculum seed data
scripts/        migrate.ts (create tables), seed.ts (curriculum + embeddings)
content/        Markdown knowledge base, grouped by subject
```

New API routes: `POST /api/curriculum/draft` (LLM topic draft), `POST /api/subjects`
(create subject + topics), `POST /api/ingest` (upload PDF), `POST /api/ingest/text`
(paste text or fetch a URL), `GET /api/sources` (ingestion status).

## Notes on concurrency

SQLite runs in **WAL mode** so multiple students can read/write at once. Ollama generates responses sequentially per model, so under heavy simultaneous use requests queue on the host — fine for a handful of concurrent learners. Use a larger model only if the host has the hardware for it.

## Cross-platform

The codebase runs identically on macOS and Windows: `better-sqlite3` ships prebuilt binaries, scripts run through `tsx`, and the dev/start scripts bind the host via the Next.js CLI (no shell-specific commands).
