# Graph Report - adaptive-tutor-agent  (2026-09-28)

## Corpus Check
- 131 files · ~199,236 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 742 nodes · 1738 edges · 38 communities (34 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- data.ts
- grade/route.ts
- launch.mjs
- gamify.ts
- text/route.ts
- admin/page.tsx
- llm.ts
- seed.ts
- getTopic()
- openrouter.ts
- graphify_pipeline.py
- compilerOptions
- app/page.tsx
- package.json
- getSubject()
- LearnPage()
- scripts
- MarkdownLite.tsx
- next
- AddSubjectModal()
- learn/page.tsx
- ModelPicker()
- getActiveStudent()
- ContentModals.tsx
- devDependencies
- dependencies
- session.ts
- llm/route.ts
- subtopic-nav.test.ts
- messages/route.ts
- share/route.ts
- theme/route.ts
- api/sources/route.ts
- run-e2e.ts
- next.config.mjs
- tailwindcss
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `getActiveStudent()` - 46 edges
2. `next` - 34 edges
3. `getTopic()` - 26 edges
4. `LearnPage()` - 24 edges
5. `requireAdmin()` - 23 edges
6. `getSubject()` - 20 edges
7. `AddSubjectModal()` - 17 edges
8. `resolveLlmConfig()` - 17 edges
9. `scripts` - 16 edges
10. `vitest` - 16 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `getActiveStudent()`  [EXTRACTED]
  app/api/profile/share/route.ts → lib/session.ts
- `POST()` --calls--> `createStudent()`  [EXTRACTED]
  app/api/profiles/route.ts → lib/data.ts
- `POST()` --calls--> `getActiveStudent()`  [EXTRACTED]
  app/api/admin/models/pull/route.ts → lib/session.ts
- `GET()` --calls--> `activeTutorModel()`  [EXTRACTED]
  app/api/admin/models/route.ts → lib/ollama.ts
- `GET()` --calls--> `listSources()`  [EXTRACTED]
  app/api/admin/sources/route.ts → lib/data.ts

## Import Cycles
- None detected.

## Communities (38 total, 4 thin omitted)

### Community 0 - "data.ts"
Cohesion: 0.05
Nodes (67): DELETE(), dynamic, GET(), dynamic, GET(), dynamic, GET(), dynamic (+59 more)

### Community 1 - "grade/route.ts"
Cohesion: 0.07
Nodes (63): Body, dynamic, POST(), Body, dynamic, FALLBACK, POST(), Body (+55 more)

### Community 2 - "launch.mjs"
Cohesion: 0.09
Nodes (40): ref_node_child_process, ref_node_fs, ref_node_module, ref_node_os, ref_node_url, buildAppBundle(), buildIcnsFromPng(), desktop (+32 more)

### Community 3 - "gamify.ts"
Cohesion: 0.07
Nodes (36): COOKIE_OPTS, dynamic, POST(), AchievementsModal(), Badge, GamifyData, LeaderEntry, Props (+28 more)

### Community 4 - "text/route.ts"
Cohesion: 0.12
Nodes (33): dynamic, maxDuration, POST(), chunkText(), crawlSite(), MAX_CRAWL_DEPTH, MAX_CRAWL_PAGES, sameSite() (+25 more)

### Community 5 - "admin/page.tsx"
Cohesion: 0.07
Nodes (21): AdminPage(), ChatBubble(), ChatHistory(), ChatMessage, ChatSession, Chunk, CurriculumSubject, CurriculumTab() (+13 more)

### Community 6 - "llm.ts"
Cohesion: 0.13
Nodes (30): dynamic, maxDuration, POST(), dynamic, GET(), embedModel(), numCtx(), numPredict() (+22 more)

### Community 7 - "seed.ts"
Cohesion: 0.12
Nodes (23): BLOOM_LEVELS, bloomName(), SeedSubject, SeedTopic, SUBJECTS, TOPICS, applySchema(), ensureColumn() (+15 more)

### Community 8 - "getTopic()"
Cohesion: 0.17
Nodes (22): DELETE(), dynamic, PATCH(), dynamic, maxDuration, POST(), loadEnv(), deleteTopic() (+14 more)

### Community 9 - "openrouter.ts"
Cohesion: 0.16
Nodes (19): dynamic, POST(), CachePayload, dynamic, GET(), readCache(), writeCache(), getSystemSetting() (+11 more)

### Community 10 - "graphify_pipeline.py"
Cohesion: 0.11
Nodes (15): graphify_analyze, graphify_build, graphify_cluster, graphify_detect, graphify_export, graphify_extract, graphify_llm, graphify_report (+7 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "app/page.tsx"
Cohesion: 0.16
Nodes (13): COLORS, Modal(), Profile, ProfilesPage(), Health, HealthBadge(), applyTheme(), LABELS (+5 more)

### Community 13 - "package.json"
Cohesion: 0.11
Nodes (17): description, engines, node, name, private, version, autoprefixer, ollama (+9 more)

### Community 14 - "getSubject()"
Cohesion: 0.23
Nodes (14): DELETE(), dynamic, PATCH(), Body, dynamic, POST(), TopicInput, createSubject() (+6 more)

### Community 15 - "LearnPage()"
Cohesion: 0.18
Nodes (13): ActionBtn(), LearnPage(), askQuiz(), gradeAnswer(), historyForApi(), loadMessages(), onSelectSubject(), onSend() (+5 more)

### Community 16 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, admin:grant, app:install, bootstrap, build, db:migrate, dev, launch (+8 more)

### Community 17 - "MarkdownLite.tsx"
Cohesion: 0.22
Nodes (13): Bubble(), MarkdownLite(), mathHtml(), MathToken, normalizeMath(), renderCodeAndMath(), renderInline(), renderMathTokens() (+5 more)

### Community 18 - "next"
Cohesion: 0.14
Nodes (10): dynamic, maxDuration, POST(), dynamic, GET(), app_globals, metadata, viewport (+2 more)

### Community 19 - "AddSubjectModal()"
Cohesion: 0.19
Nodes (6): AddSubjectModal(), onChapterFile(), prettifyFileName(), removeChapter(), updateChapter(), ChapterBuilder()

### Community 20 - "learn/page.tsx"
Cohesion: 0.15
Nodes (12): BLOOM, ChatMsg, Focus, Gap, NextStep, PHASE_LABELS, StateData, Subject (+4 more)

### Community 21 - "ModelPicker()"
Cohesion: 0.18
Nodes (7): Filter, fmt(), fmtCtx(), ModelPicker(), OpenRouterModel, ProfileLlm, Props

### Community 22 - "getActiveStudent()"
Cohesion: 0.27
Nodes (10): dynamic, maxDuration, POST(), DELETE(), dynamic, GET(), POST(), setSystemSetting() (+2 more)

### Community 23 - "ContentModals.tsx"
Cohesion: 0.20
Nodes (9): ACTIVE_STATUSES, AddMaterialModal(), Chapter, Draft, DraftTopic, Modal(), Source, StatusBadge() (+1 more)

### Community 24 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, postcss, tailwindcss, tsx, @types/better-sqlite3, @types/katex, @types/node (+4 more)

### Community 25 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, better-sqlite3, drizzle-orm, katex, next, ollama, react, react-dom (+3 more)

### Community 26 - "session.ts"
Cohesion: 0.28
Nodes (7): COOKIE_OPTS, dynamic, GET(), POST(), listStudents(), getStudentId(), SESSION_COOKIE

### Community 27 - "llm/route.ts"
Cohesion: 0.46
Nodes (7): dynamic, GET(), maskKey(), POST(), getStudentLlm(), updateStudentLlm(), validateApiKey()

### Community 28 - "subtopic-nav.test.ts"
Cohesion: 0.39
Nodes (6): allQuizzed(), findNextSubtopic(), ProgressMap, SubtopicItem, SubtopicProgressEntry, items

### Community 29 - "messages/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), getRecentMessages()

### Community 30 - "share/route.ts"
Cohesion: 0.50
Nodes (3): dynamic, POST(), lib_data_setsharestats

### Community 31 - "theme/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, PATCH(), updateStudentTheme()

### Community 32 - "api/sources/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), listSources()

### Community 33 - "run-e2e.ts"
Cohesion: 0.83
Nodes (3): check(), cookieFrom(), main()

## Knowledge Gaps
- **223 isolated node(s):** `Tab`, `ProfileSummary`, `ProfileDetail`, `ChatMessage`, `ChatSession` (+218 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 302 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `data.ts`, `grade/route.ts`, `gamify.ts`, `text/route.ts`, `admin/page.tsx`, `llm.ts`, `getTopic()`, `openrouter.ts`, `app/page.tsx`, `package.json`, `getSubject()`, `learn/page.tsx`, `getActiveStudent()`, `session.ts`, `llm/route.ts`, `messages/route.ts`, `share/route.ts`, `theme/route.ts`, `api/sources/route.ts`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Why does `vitest` connect `data.ts` to `grade/route.ts`, `gamify.ts`, `text/route.ts`, `llm.ts`, `seed.ts`, `openrouter.ts`, `package.json`, `getSubject()`, `MarkdownLite.tsx`, `subtopic-nav.test.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `react` connect `app/page.tsx` to `gamify.ts`, `admin/page.tsx`, `package.json`, `MarkdownLite.tsx`, `learn/page.tsx`, `ModelPicker()`, `ContentModals.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `Tab`, `ProfileSummary`, `ProfileDetail` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05171907140758154 - nodes in this community are weakly interconnected._
- **Should `grade/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06631578947368422 - nodes in this community are weakly interconnected._
- **Should `launch.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09131205673758866 - nodes in this community are weakly interconnected._