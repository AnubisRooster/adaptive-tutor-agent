# Graph Report - adaptive-tutor-agent  (2026-11-02)

## Corpus Check
- 131 files · ~123,139 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 745 nodes · 1762 edges · 35 communities (31 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- grade/route.ts
- getActiveStudent()
- launch.mjs
- text/route.ts
- gamify.ts
- admin/page.tsx
- llm.ts
- data.ts
- subtopics-gen.ts
- curriculum.ts
- prompts.ts
- requireAdmin()
- react
- compilerOptions
- LearnPage()
- devDependencies
- scripts
- dependencies
- admin/sources/route.ts
- learn/page.tsx
- MarkdownLite.tsx
- ContentModals.tsx
- AddSubjectModal()
- ModelPicker()
- getAllTopics()
- package.json
- select/route.ts
- subtopic-nav.test.ts
- chunks/route.ts
- tailwindcss
- run-e2e.ts
- next.config.mjs
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `getActiveStudent()` - 46 edges
2. `next` - 35 edges
3. `getTopic()` - 26 edges
4. `LearnPage()` - 24 edges
5. `requireAdmin()` - 23 edges
6. `getSubject()` - 20 edges
7. `AddSubjectModal()` - 17 edges
8. `resolveLlmConfig()` - 17 edges
9. `vitest` - 17 edges
10. `scripts` - 16 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `createStudent()`  [EXTRACTED]
  app/api/profiles/route.ts → lib/data.ts
- `GET()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/chunks/route.ts → lib/admin.ts
- `DELETE()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/chunks/route.ts → lib/admin.ts
- `POST()` --calls--> `getActiveStudent()`  [EXTRACTED]
  app/api/admin/models/pull/route.ts → lib/session.ts
- `GET()` --calls--> `activeTutorModel()`  [EXTRACTED]
  app/api/admin/models/route.ts → lib/ollama.ts

## Import Cycles
- None detected.

## Communities (35 total, 4 thin omitted)

### Community 0 - "grade/route.ts"
Cohesion: 0.07
Nodes (69): Body, dynamic, POST(), Body, dynamic, FALLBACK, POST(), POST() (+61 more)

### Community 1 - "getActiveStudent()"
Cohesion: 0.05
Nodes (57): dynamic, maxDuration, POST(), DELETE(), dynamic, GET(), POST(), dynamic (+49 more)

### Community 2 - "launch.mjs"
Cohesion: 0.08
Nodes (35): buildAppBundle(), buildIcnsFromPng(), desktop, __dirname, ROOT, targets, checkNodeVersion(), __dirname (+27 more)

### Community 3 - "text/route.ts"
Cohesion: 0.11
Nodes (35): dynamic, maxDuration, POST(), chunkText(), crawlSite(), MAX_CRAWL_DEPTH, MAX_CRAWL_PAGES, sameSite() (+27 more)

### Community 4 - "gamify.ts"
Cohesion: 0.08
Nodes (24): dynamic, GET(), AchievementsModal(), Badge, GamifyData, LeaderEntry, Props, xpProgressPct() (+16 more)

### Community 5 - "admin/page.tsx"
Cohesion: 0.07
Nodes (21): AdminPage(), ChatBubble(), ChatHistory(), ChatMessage, ChatSession, Chunk, CurriculumSubject, CurriculumTab() (+13 more)

### Community 6 - "llm.ts"
Cohesion: 0.15
Nodes (25): dynamic, maxDuration, POST(), dynamic, GET(), embedModel(), numCtx(), numPredict() (+17 more)

### Community 7 - "data.ts"
Cohesion: 0.13
Nodes (25): db, globalForDb, sqlite, gaps, KnowledgeChunk, knowledgeChunks, Message, messages (+17 more)

### Community 8 - "subtopics-gen.ts"
Cohesion: 0.14
Nodes (25): Body, dynamic, POST(), TopicInput, dynamic, maxDuration, POST(), loadEnv() (+17 more)

### Community 9 - "curriculum.ts"
Cohesion: 0.14
Nodes (17): BLOOM_LEVELS, SeedSubject, SeedTopic, SUBJECTS, TOPICS, applySchema(), ensureColumn(), SCHEMA_SQL (+9 more)

### Community 10 - "prompts.ts"
Cohesion: 0.15
Nodes (17): bloomName(), Gap, mastery, Mastery, Student, Subject, Topic, buildGradeMessages() (+9 more)

### Community 11 - "requireAdmin()"
Cohesion: 0.16
Nodes (16): dynamic, GET(), dynamic, GET(), DELETE(), dynamic, PATCH(), DELETE() (+8 more)

### Community 12 - "react"
Cohesion: 0.15
Nodes (14): COLORS, Modal(), Profile, ProfilesPage(), Health, HealthBadge(), applyTheme(), LABELS (+6 more)

### Community 14 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 15 - "LearnPage()"
Cohesion: 0.18
Nodes (13): ActionBtn(), LearnPage(), askQuiz(), gradeAnswer(), historyForApi(), loadMessages(), onSelectSubject(), onSend() (+5 more)

### Community 16 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer@^10.4.20, tsx@^4.19.2, @types/better-sqlite3@^7.6.12, @types/katex@^0.16.7, @types/node@^22.10.5, @types/react-dom@^19.0.2, typescript@^5.7.3 (+8 more)

### Community 17 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, admin:grant, app:install, bootstrap, build, db:migrate, dev, launch (+8 more)

### Community 18 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, better-sqlite3@^11.8.1, drizzle-orm@^0.38.3, katex@^0.16.11, next@^15.1.4, ollama@^0.5.12, react-dom@^19.0.0, unpdf@^1.6.2 (+7 more)

### Community 19 - "admin/sources/route.ts"
Cohesion: 0.22
Nodes (12): DELETE(), dynamic, GET(), maxDuration, POST(), dynamic, GET(), deleteSource() (+4 more)

### Community 20 - "learn/page.tsx"
Cohesion: 0.15
Nodes (12): BLOOM, ChatMsg, Focus, Gap, NextStep, PHASE_LABELS, StateData, Subject (+4 more)

### Community 21 - "MarkdownLite.tsx"
Cohesion: 0.27
Nodes (11): Bubble(), MarkdownLite(), mathHtml(), MathToken, normalizeMath(), renderCodeAndMath(), renderInline(), renderMathTokens() (+3 more)

### Community 22 - "ContentModals.tsx"
Cohesion: 0.18
Nodes (10): ACTIVE_STATUSES, AddMaterialModal(), Chapter, ChapterBuilder(), Draft, DraftTopic, Modal(), Source (+2 more)

### Community 23 - "AddSubjectModal()"
Cohesion: 0.17
Nodes (3): AddSubjectModal(), onChapterFile(), prettifyFileName()

### Community 24 - "ModelPicker()"
Cohesion: 0.18
Nodes (7): Filter, fmt(), fmtCtx(), ModelPicker(), OpenRouterModel, ProfileLlm, Props

### Community 25 - "getAllTopics()"
Cohesion: 0.25
Nodes (9): dynamic, GET(), dynamic, GET(), AdminProfileChats, adminProfileChats(), AdminProfileDetail, adminProfileDetail() (+1 more)

### Community 26 - "package.json"
Cohesion: 0.18
Nodes (10): description, postcss@^8.4.49, @types/react@^19.0.4, engines, node, name, private, version (+2 more)

### Community 27 - "select/route.ts"
Cohesion: 0.32
Nodes (6): COOKIE_OPTS, dynamic, POST(), hashPin(), touchStudent(), verifyPin()

### Community 28 - "subtopic-nav.test.ts"
Cohesion: 0.39
Nodes (6): allQuizzed(), findNextSubtopic(), ProgressMap, SubtopicItem, SubtopicProgressEntry, items

### Community 29 - "chunks/route.ts"
Cohesion: 0.43
Nodes (6): DELETE(), dynamic, GET(), deleteChunk(), getChunk(), listChunks()

### Community 30 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

### Community 31 - "run-e2e.ts"
Cohesion: 0.83
Nodes (3): check(), cookieFrom(), main()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `getActiveStudent()` to `grade/route.ts`, `text/route.ts`, `gamify.ts`, `admin/page.tsx`, `llm.ts`, `subtopics-gen.ts`, `requireAdmin()`, `react`, `dependencies`, `admin/sources/route.ts`, `learn/page.tsx`, `getAllTopics()`, `package.json`, `select/route.ts`, `chunks/route.ts`?**
  _High betweenness centrality (0.292) - this node is a cross-community bridge._
- **Should `grade/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06654622101776574 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `prompts.ts` to `grade/route.ts`, `getActiveStudent()`, `launch.mjs`, `text/route.ts`, `gamify.ts`, `llm.ts`, `data.ts`, `subtopics-gen.ts`, `curriculum.ts`, `devDependencies`, `MarkdownLite.tsx`, `package.json`, `subtopic-nav.test.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `getActiveStudent()` be split into smaller, more focused modules?**
  _Cohesion score 0.053313587560162905 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `gamify.ts`, `admin/page.tsx`, `learn/page.tsx`, `MarkdownLite.tsx`, `ContentModals.tsx`, `ModelPicker()`, `package.json`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `launch.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08408163265306122 - nodes in this community are weakly interconnected._
- **Should `text/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11416490486257928 - nodes in this community are weakly interconnected._