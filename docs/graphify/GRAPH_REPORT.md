# Graph Report - adaptive-tutor-agent  (2026-09-21)

## Corpus Check
- 131 files · ~193,711 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 742 nodes · 1712 edges · 43 communities (39 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- grade/route.ts
- launch.mjs
- gamify.ts
- text/route.ts
- admin/page.tsx
- llm.ts
- data.ts
- seed.ts
- getTopic()
- graphify_pipeline.py
- compilerOptions
- app/page.tsx
- package.json
- getSubject()
- next
- learn/page.tsx
- prompts.ts
- requireAdmin()
- openrouter.ts
- scripts
- LearnPage()
- AddSubjectModal()
- MarkdownLite.tsx
- openrouter/models/route.ts
- getActiveStudent()
- ModelPicker.tsx
- ContentModals.tsx
- devDependencies
- dependencies
- llm/route.ts
- subtopic-nav.test.ts
- chunks/route.ts
- pull/route.ts
- layout.tsx
- curriculum/route.ts
- profiles/[id]/route.ts
- admin/profiles/route.ts
- messages/route.ts
- run-e2e.ts
- next.config.mjs
- tailwindcss
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `getActiveStudent()` - 46 edges
2. `next` - 34 edges
3. `getTopic()` - 26 edges
4. `requireAdmin()` - 23 edges
5. `getSubject()` - 20 edges
6. `resolveLlmConfig()` - 17 edges
7. `scripts` - 16 edges
8. `vitest` - 16 edges
9. `compilerOptions` - 16 edges
10. `getStudent()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `getActiveStudent()`  [EXTRACTED]
  app/api/admin/models/pull/route.ts → lib/session.ts
- `POST()` --calls--> `getActiveStudent()`  [EXTRACTED]
  app/api/profile/share/route.ts → lib/session.ts
- `POST()` --calls--> `createStudent()`  [EXTRACTED]
  app/api/profiles/route.ts → lib/data.ts
- `GET()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/chunks/route.ts → lib/admin.ts
- `DELETE()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/chunks/route.ts → lib/admin.ts

## Import Cycles
- None detected.

## Communities (43 total, 4 thin omitted)

### Community 0 - "grade/route.ts"
Cohesion: 0.07
Nodes (63): Body, dynamic, POST(), Body, dynamic, FALLBACK, POST(), Body (+55 more)

### Community 1 - "launch.mjs"
Cohesion: 0.09
Nodes (40): ref_node_child_process, ref_node_fs, ref_node_module, ref_node_os, ref_node_url, buildAppBundle(), buildIcnsFromPng(), desktop (+32 more)

### Community 2 - "gamify.ts"
Cohesion: 0.07
Nodes (36): COOKIE_OPTS, dynamic, POST(), AchievementsModal(), Badge, GamifyData, LeaderEntry, Props (+28 more)

### Community 3 - "text/route.ts"
Cohesion: 0.12
Nodes (33): dynamic, maxDuration, POST(), chunkText(), crawlSite(), MAX_CRAWL_DEPTH, MAX_CRAWL_PAGES, sameSite() (+25 more)

### Community 4 - "admin/page.tsx"
Cohesion: 0.06
Nodes (20): ChatBubble(), ChatHistory(), ChatMessage, ChatSession, Chunk, CurriculumSubject, CurriculumTab(), CurriculumTopic (+12 more)

### Community 5 - "llm.ts"
Cohesion: 0.13
Nodes (30): dynamic, maxDuration, POST(), dynamic, GET(), embedModel(), numCtx(), numPredict() (+22 more)

### Community 6 - "data.ts"
Cohesion: 0.13
Nodes (26): db, globalForDb, sqlite, gaps, KnowledgeChunk, knowledgeChunks, Message, messages (+18 more)

### Community 7 - "seed.ts"
Cohesion: 0.12
Nodes (23): BLOOM_LEVELS, bloomName(), SeedSubject, SeedTopic, SUBJECTS, TOPICS, applySchema(), ensureColumn() (+15 more)

### Community 8 - "getTopic()"
Cohesion: 0.17
Nodes (22): DELETE(), dynamic, PATCH(), dynamic, maxDuration, POST(), loadEnv(), deleteTopic() (+14 more)

### Community 9 - "graphify_pipeline.py"
Cohesion: 0.11
Nodes (15): graphify_analyze, graphify_build, graphify_cluster, graphify_detect, graphify_export, graphify_extract, graphify_llm, graphify_report (+7 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "app/page.tsx"
Cohesion: 0.14
Nodes (12): COLORS, Profile, ProfilesPage(), Health, HealthBadge(), applyTheme(), LABELS, ORDER (+4 more)

### Community 12 - "package.json"
Cohesion: 0.11
Nodes (17): description, engines, node, name, private, version, autoprefixer, ollama (+9 more)

### Community 13 - "getSubject()"
Cohesion: 0.23
Nodes (14): DELETE(), dynamic, PATCH(), Body, dynamic, POST(), TopicInput, createSubject() (+6 more)

### Community 14 - "next"
Cohesion: 0.15
Nodes (13): dynamic, GET(), dynamic, POST(), COOKIE_OPTS, dynamic, GET(), POST() (+5 more)

### Community 15 - "learn/page.tsx"
Cohesion: 0.12
Nodes (12): BLOOM, ChatMsg, Focus, Gap, NextStep, PHASE_LABELS, StateData, Subject (+4 more)

### Community 16 - "prompts.ts"
Cohesion: 0.17
Nodes (13): Gap, Mastery, Student, Subject, Topic, buildGradeMessages(), SubtopicProgressEntry, TONE_GUIDE (+5 more)

### Community 17 - "requireAdmin()"
Cohesion: 0.22
Nodes (14): dynamic, GET(), DELETE(), dynamic, GET(), maxDuration, POST(), adminProfileChats (+6 more)

### Community 18 - "openrouter.ts"
Cohesion: 0.21
Nodes (13): dynamic, POST(), buildBody(), buildHeaders(), ChatOpts, fetchModelCatalog(), normalizeModel(), OPENROUTER_BASE (+5 more)

### Community 19 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, admin:grant, app:install, bootstrap, build, db:migrate, dev, launch (+8 more)

### Community 20 - "LearnPage()"
Cohesion: 0.23
Nodes (10): LearnPage(), askQuiz(), gradeAnswer(), historyForApi(), loadMessages(), onSelectSubject(), onSend(), selectSubtopic() (+2 more)

### Community 21 - "AddSubjectModal()"
Cohesion: 0.18
Nodes (6): AddSubjectModal(), onChapterFile(), prettifyFileName(), removeChapter(), updateChapter(), ChapterBuilder()

### Community 22 - "MarkdownLite.tsx"
Cohesion: 0.23
Nodes (11): MarkdownLite(), mathHtml(), MathToken, normalizeMath(), renderCodeAndMath(), renderInline(), renderMathTokens(), renderSegment() (+3 more)

### Community 23 - "openrouter/models/route.ts"
Cohesion: 0.24
Nodes (11): DELETE(), dynamic, GET(), POST(), CachePayload, dynamic, GET(), readCache() (+3 more)

### Community 24 - "getActiveStudent()"
Cohesion: 0.21
Nodes (10): dynamic, maxDuration, POST(), dynamic, PATCH(), dynamic, GET(), updateStudentTheme() (+2 more)

### Community 25 - "ModelPicker.tsx"
Cohesion: 0.18
Nodes (7): Filter, fmt(), fmtCtx(), ModelPicker(), OpenRouterModel, ProfileLlm, Props

### Community 26 - "ContentModals.tsx"
Cohesion: 0.17
Nodes (7): ACTIVE_STATUSES, AddMaterialModal(), Chapter, Draft, DraftTopic, Source, TopicLite

### Community 27 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, postcss, tailwindcss, tsx, @types/better-sqlite3, @types/katex, @types/node (+4 more)

### Community 28 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, better-sqlite3, drizzle-orm, katex, next, ollama, react, react-dom (+3 more)

### Community 29 - "llm/route.ts"
Cohesion: 0.46
Nodes (7): dynamic, GET(), maskKey(), POST(), getStudentLlm(), updateStudentLlm(), validateApiKey()

### Community 30 - "subtopic-nav.test.ts"
Cohesion: 0.39
Nodes (6): allQuizzed(), findNextSubtopic(), ProgressMap, SubtopicItem, SubtopicProgressEntry, items

### Community 31 - "chunks/route.ts"
Cohesion: 0.43
Nodes (6): DELETE(), dynamic, GET(), deleteChunk(), getChunk(), listChunks()

### Community 32 - "pull/route.ts"
Cohesion: 0.40
Nodes (4): dynamic, maxDuration, POST(), ollama

### Community 33 - "layout.tsx"
Cohesion: 0.40
Nodes (3): app_globals, metadata, viewport

### Community 34 - "curriculum/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), adminCurriculum()

### Community 35 - "profiles/[id]/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), adminProfileDetail

### Community 36 - "admin/profiles/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), adminListProfiles()

### Community 37 - "messages/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), getRecentMessages()

### Community 38 - "run-e2e.ts"
Cohesion: 0.83
Nodes (3): check(), cookieFrom(), main()

## Knowledge Gaps
- **223 isolated node(s):** `Tab`, `ProfileSummary`, `ProfileDetail`, `ChatMessage`, `ChatSession` (+218 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 311 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `grade/route.ts`, `gamify.ts`, `text/route.ts`, `admin/page.tsx`, `llm.ts`, `getTopic()`, `app/page.tsx`, `package.json`, `getSubject()`, `learn/page.tsx`, `requireAdmin()`, `openrouter.ts`, `openrouter/models/route.ts`, `getActiveStudent()`, `llm/route.ts`, `chunks/route.ts`, `layout.tsx`, `curriculum/route.ts`, `profiles/[id]/route.ts`, `admin/profiles/route.ts`, `messages/route.ts`?**
  _High betweenness centrality (0.296) - this node is a cross-community bridge._
- **Why does `react` connect `app/page.tsx` to `gamify.ts`, `admin/page.tsx`, `package.json`, `learn/page.tsx`, `MarkdownLite.tsx`, `ModelPicker.tsx`, `ContentModals.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `vitest` connect `prompts.ts` to `grade/route.ts`, `gamify.ts`, `text/route.ts`, `llm.ts`, `data.ts`, `seed.ts`, `package.json`, `getSubject()`, `openrouter.ts`, `MarkdownLite.tsx`, `subtopic-nav.test.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `Tab`, `ProfileSummary`, `ProfileDetail` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `grade/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06631578947368422 - nodes in this community are weakly interconnected._
- **Should `launch.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09131205673758866 - nodes in this community are weakly interconnected._
- **Should `gamify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07171717171717172 - nodes in this community are weakly interconnected._