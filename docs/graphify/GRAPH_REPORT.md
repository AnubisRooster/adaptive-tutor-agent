# Graph Report - adaptive-tutor-agent  (2026-09-14)

## Corpus Check
- 131 files · ~193,474 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 712 nodes · 1621 edges · 37 communities (30 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- grade/route.ts
- getActiveStudent()
- llm.ts
- package.json
- crawl.ts
- admin/page.tsx
- gamify.ts
- data.ts
- getTopic()
- launch.mjs
- schemas.ts
- compilerOptions
- react
- prompts.ts
- requireAdmin()
- getSubject()
- learn/page.tsx
- scripts
- admin/sources/route.ts
- LearnPage()
- AddSubjectModal()
- MarkdownLite.tsx
- ModelPicker.tsx
- ContentModals.tsx
- setup.mjs
- select/route.ts
- subtopic-nav.test.ts
- chunks/route.ts
- install-macos-app.mjs
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

## Communities (37 total, 4 thin omitted)

### Community 0 - "grade/route.ts"
Cohesion: 0.08
Nodes (57): Body, dynamic, POST(), Body, dynamic, FALLBACK, POST(), Body (+49 more)

### Community 1 - "getActiveStudent()"
Cohesion: 0.06
Nodes (53): dynamic, maxDuration, POST(), DELETE(), dynamic, GET(), POST(), dynamic (+45 more)

### Community 2 - "llm.ts"
Cohesion: 0.08
Nodes (41): dynamic, GET(), BLOOM_LEVELS, bloomName(), SeedSubject, SeedTopic, SUBJECTS, TOPICS (+33 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (45): metadata, viewport, dependencies, better-sqlite3, drizzle-orm, katex, next, ollama (+37 more)

### Community 4 - "crawl.ts"
Cohesion: 0.11
Nodes (36): dynamic, maxDuration, POST(), dynamic, maxDuration, POST(), chunkText(), crawlSite() (+28 more)

### Community 5 - "admin/page.tsx"
Cohesion: 0.06
Nodes (20): ChatBubble(), ChatHistory(), ChatMessage, ChatSession, Chunk, CurriculumSubject, CurriculumTab(), CurriculumTopic (+12 more)

### Community 6 - "gamify.ts"
Cohesion: 0.11
Nodes (24): dynamic, GET(), AchievementsModal(), Badge, GamifyData, LeaderEntry, Props, xpProgressPct() (+16 more)

### Community 7 - "data.ts"
Cohesion: 0.13
Nodes (25): db, globalForDb, sqlite, gaps, KnowledgeChunk, knowledgeChunks, Message, messages (+17 more)

### Community 8 - "getTopic()"
Cohesion: 0.18
Nodes (20): DELETE(), dynamic, PATCH(), dynamic, maxDuration, POST(), deleteTopic(), getTopic() (+12 more)

### Community 9 - "launch.mjs"
Cohesion: 0.24
Nodes (20): checkNodeVersion(), __dirname, ensureBuild(), ensureDb(), ensureDependencies(), ensureModel(), ensureNativeModules(), ensureOllama() (+12 more)

### Community 10 - "schemas.ts"
Cohesion: 0.15
Nodes (18): dynamic, maxDuration, POST(), curriculumFormat, curriculumMessages(), generateCurriculumDraft(), parseCurriculumDraft(), streamStructured() (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "react"
Cohesion: 0.14
Nodes (12): COLORS, Profile, ProfilesPage(), Health, HealthBadge(), applyTheme(), LABELS, ORDER (+4 more)

### Community 13 - "prompts.ts"
Cohesion: 0.16
Nodes (14): Gap, Mastery, Student, Subject, Topic, buildTutorSystemPrompt(), masteryBand(), SubtopicProgressEntry (+6 more)

### Community 14 - "requireAdmin()"
Cohesion: 0.18
Nodes (13): dynamic, GET(), dynamic, GET(), dynamic, GET(), dynamic, GET() (+5 more)

### Community 15 - "getSubject()"
Cohesion: 0.23
Nodes (14): DELETE(), dynamic, PATCH(), Body, dynamic, POST(), TopicInput, createSubject() (+6 more)

### Community 16 - "learn/page.tsx"
Cohesion: 0.12
Nodes (12): BLOOM, ChatMsg, Focus, Gap, NextStep, PHASE_LABELS, StateData, Subject (+4 more)

### Community 17 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, admin:grant, app:install, bootstrap, build, db:migrate, dev, launch (+8 more)

### Community 18 - "admin/sources/route.ts"
Cohesion: 0.22
Nodes (12): DELETE(), dynamic, GET(), maxDuration, POST(), dynamic, GET(), deleteSource() (+4 more)

### Community 19 - "LearnPage()"
Cohesion: 0.23
Nodes (10): LearnPage(), askQuiz(), gradeAnswer(), historyForApi(), loadMessages(), onSelectSubject(), onSend(), selectSubtopic() (+2 more)

### Community 20 - "AddSubjectModal()"
Cohesion: 0.18
Nodes (6): AddSubjectModal(), onChapterFile(), prettifyFileName(), removeChapter(), updateChapter(), ChapterBuilder()

### Community 21 - "MarkdownLite.tsx"
Cohesion: 0.26
Nodes (10): MarkdownLite(), mathHtml(), MathToken, normalizeMath(), renderCodeAndMath(), renderInline(), renderMathTokens(), renderSegment() (+2 more)

### Community 22 - "ModelPicker.tsx"
Cohesion: 0.18
Nodes (7): Filter, fmt(), fmtCtx(), ModelPicker(), OpenRouterModel, ProfileLlm, Props

### Community 23 - "ContentModals.tsx"
Cohesion: 0.17
Nodes (7): ACTIVE_STATUSES, AddMaterialModal(), Chapter, Draft, DraftTopic, Source, TopicLite

### Community 24 - "setup.mjs"
Cohesion: 0.40
Nodes (9): __dirname, log(), main(), ok(), readEnvValue(), ROOT, run(), warn() (+1 more)

### Community 25 - "select/route.ts"
Cohesion: 0.32
Nodes (6): COOKIE_OPTS, dynamic, POST(), hashPin(), touchStudent(), verifyPin()

### Community 26 - "subtopic-nav.test.ts"
Cohesion: 0.39
Nodes (6): allQuizzed(), findNextSubtopic(), ProgressMap, SubtopicItem, SubtopicProgressEntry, items

### Community 27 - "chunks/route.ts"
Cohesion: 0.43
Nodes (6): DELETE(), dynamic, GET(), deleteChunk(), getChunk(), listChunks()

### Community 28 - "install-macos-app.mjs"
Cohesion: 0.33
Nodes (6): buildAppBundle(), buildIcnsFromPng(), desktop, __dirname, ROOT, targets

### Community 29 - "run-e2e.ts"
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
- **Why does `vitest` connect `prompts.ts` to `grade/route.ts`, `getActiveStudent()`, `llm.ts`, `package.json`, `crawl.ts`, `gamify.ts`, `data.ts`, `schemas.ts`, `getSubject()`, `MarkdownLite.tsx`, `subtopic-nav.test.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `Tab`, `ProfileSummary`, `ProfileDetail` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `grade/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07945566286215978 - nodes in this community are weakly interconnected._
- **Should `getActiveStudent()` be split into smaller, more focused modules?**
  _Cohesion score 0.06057692307692308 - nodes in this community are weakly interconnected._
- **Should `llm.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08345428156748912 - nodes in this community are weakly interconnected._