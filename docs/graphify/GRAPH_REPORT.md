# Graph Report - adaptive-tutor-agent  (2026-09-06)

## Corpus Check
- 130 files · ~87,804 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 712 nodes · 1615 edges · 38 communities (31 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- getActiveStudent()
- getTopic()
- crawl.ts
- llm.ts
- package.json
- grade/route.ts
- admin/page.tsx
- gamify.ts
- data.ts
- curriculum.ts
- launch.mjs
- compilerOptions
- react
- requireAdmin()
- learn/page.tsx
- prompts.ts
- scripts
- LearnPage()
- AddSubjectModal()
- MarkdownLite.tsx
- ModelPicker.tsx
- ContentModals.tsx
- admin/sources/route.ts
- setup.mjs
- select/route.ts
- subtopic-nav.test.ts
- chunks/route.ts
- vitest
- install-macos-app.mjs
- subjects/[id]/route.ts
- run-e2e.ts
- next.config.mjs
- graphify_pipeline.py
- make-icons.py
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `getActiveStudent()` - 46 edges
2. `getTopic()` - 26 edges
3. `requireAdmin()` - 23 edges
4. `getSubject()` - 20 edges
5. `resolveLlmConfig()` - 17 edges
6. `scripts` - 16 edges
7. `compilerOptions` - 16 edges
8. `getStudent()` - 15 edges
9. `retrieveContext()` - 15 edges
10. `vitest` - 15 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/chunks/route.ts → lib/admin.ts
- `DELETE()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/chunks/route.ts → lib/admin.ts
- `POST()` --calls--> `getActiveStudent()`  [EXTRACTED]
  app/api/admin/models/pull/route.ts → lib/session.ts
- `GET()` --calls--> `activeTutorModel()`  [EXTRACTED]
  app/api/admin/models/route.ts → lib/ollama.ts
- `GET()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/sources/route.ts → lib/admin.ts

## Import Cycles
- None detected.

## Communities (38 total, 4 thin omitted)

### Community 0 - "getActiveStudent()"
Cohesion: 0.06
Nodes (52): dynamic, maxDuration, POST(), DELETE(), dynamic, GET(), POST(), dynamic (+44 more)

### Community 1 - "getTopic()"
Cohesion: 0.09
Nodes (47): DELETE(), dynamic, PATCH(), Body, dynamic, POST(), TopicInput, dynamic (+39 more)

### Community 2 - "crawl.ts"
Cohesion: 0.10
Nodes (40): dynamic, maxDuration, POST(), dynamic, maxDuration, POST(), chunkText(), crawlSite() (+32 more)

### Community 3 - "llm.ts"
Cohesion: 0.08
Nodes (40): dynamic, maxDuration, POST(), dynamic, GET(), embedModel(), numCtx(), numPredict() (+32 more)

### Community 4 - "package.json"
Cohesion: 0.04
Nodes (45): metadata, viewport, dependencies, better-sqlite3, drizzle-orm, katex, next, ollama (+37 more)

### Community 5 - "grade/route.ts"
Cohesion: 0.11
Nodes (40): Body, dynamic, POST(), Body, dynamic, FALLBACK, POST(), Body (+32 more)

### Community 6 - "admin/page.tsx"
Cohesion: 0.06
Nodes (20): ChatBubble(), ChatHistory(), ChatMessage, ChatSession, Chunk, CurriculumSubject, CurriculumTab(), CurriculumTopic (+12 more)

### Community 7 - "gamify.ts"
Cohesion: 0.11
Nodes (24): dynamic, GET(), AchievementsModal(), Badge, GamifyData, LeaderEntry, Props, xpProgressPct() (+16 more)

### Community 8 - "data.ts"
Cohesion: 0.15
Nodes (21): gaps, KnowledgeChunk, Message, messages, Session, sessions, Source, sources (+13 more)

### Community 9 - "curriculum.ts"
Cohesion: 0.14
Nodes (18): BLOOM_LEVELS, bloomName(), SeedSubject, SeedTopic, SUBJECTS, TOPICS, applySchema(), ensureColumn() (+10 more)

### Community 10 - "launch.mjs"
Cohesion: 0.23
Nodes (20): checkNodeVersion(), __dirname, ensureBuild(), ensureDb(), ensureDependencies(), ensureModel(), ensureNativeModules(), ensureOllama() (+12 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "react"
Cohesion: 0.14
Nodes (12): COLORS, Profile, ProfilesPage(), Health, HealthBadge(), applyTheme(), LABELS, ORDER (+4 more)

### Community 13 - "requireAdmin()"
Cohesion: 0.18
Nodes (13): dynamic, GET(), dynamic, GET(), dynamic, GET(), dynamic, GET() (+5 more)

### Community 14 - "learn/page.tsx"
Cohesion: 0.12
Nodes (12): BLOOM, ChatMsg, Focus, Gap, NextStep, PHASE_LABELS, StateData, Subject (+4 more)

### Community 15 - "prompts.ts"
Cohesion: 0.17
Nodes (13): Gap, Mastery, Student, Subject, Topic, buildTutorSystemPrompt(), masteryBand(), SubtopicProgressEntry (+5 more)

### Community 16 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, admin:grant, app:install, bootstrap, build, db:migrate, dev, launch (+8 more)

### Community 17 - "LearnPage()"
Cohesion: 0.23
Nodes (10): LearnPage(), askQuiz(), gradeAnswer(), historyForApi(), loadMessages(), onSelectSubject(), onSend(), selectSubtopic() (+2 more)

### Community 18 - "AddSubjectModal()"
Cohesion: 0.18
Nodes (6): AddSubjectModal(), onChapterFile(), prettifyFileName(), removeChapter(), updateChapter(), ChapterBuilder()

### Community 19 - "MarkdownLite.tsx"
Cohesion: 0.26
Nodes (10): MarkdownLite(), mathHtml(), MathToken, normalizeMath(), renderCodeAndMath(), renderInline(), renderMathTokens(), renderSegment() (+2 more)

### Community 20 - "ModelPicker.tsx"
Cohesion: 0.18
Nodes (7): Filter, fmt(), fmtCtx(), ModelPicker(), OpenRouterModel, ProfileLlm, Props

### Community 21 - "ContentModals.tsx"
Cohesion: 0.17
Nodes (7): ACTIVE_STATUSES, AddMaterialModal(), Chapter, Draft, DraftTopic, Source, TopicLite

### Community 22 - "admin/sources/route.ts"
Cohesion: 0.31
Nodes (9): DELETE(), dynamic, GET(), maxDuration, POST(), deleteSource(), getChunksForSource(), getSource() (+1 more)

### Community 23 - "setup.mjs"
Cohesion: 0.38
Nodes (9): __dirname, log(), main(), ok(), readEnvValue(), ROOT, run(), warn() (+1 more)

### Community 24 - "select/route.ts"
Cohesion: 0.32
Nodes (6): COOKIE_OPTS, dynamic, POST(), hashPin(), touchStudent(), verifyPin()

### Community 25 - "subtopic-nav.test.ts"
Cohesion: 0.39
Nodes (6): allQuizzed(), findNextSubtopic(), ProgressMap, SubtopicItem, SubtopicProgressEntry, items

### Community 26 - "chunks/route.ts"
Cohesion: 0.43
Nodes (6): DELETE(), dynamic, GET(), deleteChunk(), getChunk(), listChunks()

### Community 27 - "vitest"
Cohesion: 0.33
Nodes (5): db, globalForDb, sqlite, knowledgeChunks, vitest

### Community 28 - "install-macos-app.mjs"
Cohesion: 0.33
Nodes (6): buildAppBundle(), buildIcnsFromPng(), desktop, __dirname, ROOT, targets

### Community 29 - "subjects/[id]/route.ts"
Cohesion: 0.47
Nodes (5): DELETE(), dynamic, PATCH(), deleteSubject(), updateSubject()

### Community 30 - "run-e2e.ts"
Cohesion: 0.83
Nodes (3): check(), cookieFrom(), main()

## Knowledge Gaps
- **224 isolated node(s):** `Tab`, `ProfileSummary`, `ProfileDetail`, `ChatMessage`, `ChatSession` (+219 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 291 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `package.json`, `admin/page.tsx`, `gamify.ts`, `learn/page.tsx`, `MarkdownLite.tsx`, `ModelPicker.tsx`, `ContentModals.tsx`?**
  _High betweenness centrality (0.255) - this node is a cross-community bridge._
- **Why does `drizzle-orm` connect `data.ts` to `package.json`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `getActiveStudent()`, `getTopic()`, `crawl.ts`, `llm.ts`, `package.json`, `grade/route.ts`, `gamify.ts`, `curriculum.ts`, `prompts.ts`, `MarkdownLite.tsx`, `subtopic-nav.test.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `Tab`, `ProfileSummary`, `ProfileDetail` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getActiveStudent()` be split into smaller, more focused modules?**
  _Cohesion score 0.06009615384615385 - nodes in this community are weakly interconnected._
- **Should `getTopic()` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Should `crawl.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09714285714285714 - nodes in this community are weakly interconnected._