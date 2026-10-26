# Graph Report - adaptive-tutor-agent  (2026-10-26)

## Corpus Check
- 131 files · ~122,907 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 742 nodes · 1753 edges · 37 communities (33 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- grade/route.ts
- getActiveStudent()
- llm.ts
- launch.mjs
- text/route.ts
- admin/page.tsx
- gamify.ts
- data.ts
- seed.ts
- react
- compilerOptions
- getSubject()
- LearnPage()
- prompts.ts
- dependencies
- devDependencies
- scripts
- requireAdmin()
- select/route.ts
- AddSubjectModal()
- learn/page.tsx
- MarkdownLite.tsx
- ModelPicker()
- ContentModals.tsx
- package.json
- subtopic-nav.test.ts
- chunks/route.ts
- topics/[id]/route.ts
- curriculum/route.ts
- chats/route.ts
- admin/profiles/route.ts
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
- `GET()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/curriculum/route.ts → lib/admin.ts
- `POST()` --calls--> `getActiveStudent()`  [EXTRACTED]
  app/api/admin/models/pull/route.ts → lib/session.ts

## Import Cycles
- None detected.

## Communities (37 total, 4 thin omitted)

### Community 0 - "grade/route.ts"
Cohesion: 0.07
Nodes (63): Body, dynamic, POST(), Body, dynamic, FALLBACK, POST(), Body (+55 more)

### Community 1 - "getActiveStudent()"
Cohesion: 0.06
Nodes (53): dynamic, maxDuration, POST(), DELETE(), dynamic, GET(), POST(), dynamic (+45 more)

### Community 2 - "llm.ts"
Cohesion: 0.08
Nodes (50): dynamic, maxDuration, POST(), dynamic, GET(), dynamic, maxDuration, POST() (+42 more)

### Community 3 - "launch.mjs"
Cohesion: 0.09
Nodes (35): buildAppBundle(), buildIcnsFromPng(), desktop, __dirname, ROOT, targets, checkNodeVersion(), __dirname (+27 more)

### Community 4 - "text/route.ts"
Cohesion: 0.12
Nodes (32): dynamic, maxDuration, POST(), chunkText(), crawlSite(), MAX_CRAWL_DEPTH, MAX_CRAWL_PAGES, sameSite() (+24 more)

### Community 5 - "admin/page.tsx"
Cohesion: 0.07
Nodes (21): AdminPage(), ChatBubble(), ChatHistory(), ChatMessage, ChatSession, Chunk, CurriculumSubject, CurriculumTab() (+13 more)

### Community 6 - "gamify.ts"
Cohesion: 0.09
Nodes (23): AchievementsModal(), Badge, GamifyData, LeaderEntry, Props, xpProgressPct(), getStudent(), awardForGrade() (+15 more)

### Community 7 - "data.ts"
Cohesion: 0.13
Nodes (25): db, globalForDb, sqlite, gaps, KnowledgeChunk, knowledgeChunks, Message, messages (+17 more)

### Community 8 - "seed.ts"
Cohesion: 0.12
Nodes (22): BLOOM_LEVELS, bloomName(), SeedSubject, SeedTopic, SUBJECTS, TOPICS, applySchema(), ensureColumn() (+14 more)

### Community 9 - "react"
Cohesion: 0.15
Nodes (14): COLORS, Modal(), Profile, ProfilesPage(), Health, HealthBadge(), applyTheme(), LABELS (+6 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "getSubject()"
Cohesion: 0.23
Nodes (14): DELETE(), dynamic, PATCH(), Body, dynamic, POST(), TopicInput, createSubject() (+6 more)

### Community 13 - "LearnPage()"
Cohesion: 0.18
Nodes (13): ActionBtn(), LearnPage(), askQuiz(), gradeAnswer(), historyForApi(), loadMessages(), onSelectSubject(), onSend() (+5 more)

### Community 14 - "prompts.ts"
Cohesion: 0.17
Nodes (12): Gap, Mastery, Student, Subject, Topic, SubtopicProgressEntry, TONE_GUIDE, vitest (+4 more)

### Community 15 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, better-sqlite3@^11.8.1, drizzle-orm@^0.38.3, katex@^0.16.11, next@^15.1.4, ollama@^0.5.12, react-dom@^19.0.0, unpdf@^1.6.2 (+8 more)

### Community 16 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.49, @types/better-sqlite3@^7.6.12, @types/katex@^0.16.7, @types/react@^19.0.4, @types/react-dom@^19.0.2, typescript@^5.7.3 (+8 more)

### Community 17 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, admin:grant, app:install, bootstrap, build, db:migrate, dev, launch (+8 more)

### Community 18 - "requireAdmin()"
Cohesion: 0.23
Nodes (13): dynamic, GET(), DELETE(), dynamic, GET(), maxDuration, POST(), adminProfileDetail (+5 more)

### Community 19 - "select/route.ts"
Cohesion: 0.16
Nodes (12): COOKIE_OPTS, dynamic, GET(), POST(), COOKIE_OPTS, dynamic, POST(), hashPin() (+4 more)

### Community 20 - "AddSubjectModal()"
Cohesion: 0.19
Nodes (6): AddSubjectModal(), onChapterFile(), prettifyFileName(), removeChapter(), updateChapter(), ChapterBuilder()

### Community 21 - "learn/page.tsx"
Cohesion: 0.15
Nodes (12): BLOOM, ChatMsg, Focus, Gap, NextStep, PHASE_LABELS, StateData, Subject (+4 more)

### Community 22 - "MarkdownLite.tsx"
Cohesion: 0.27
Nodes (11): Bubble(), MarkdownLite(), mathHtml(), MathToken, normalizeMath(), renderCodeAndMath(), renderInline(), renderMathTokens() (+3 more)

### Community 23 - "ModelPicker()"
Cohesion: 0.18
Nodes (7): Filter, fmt(), fmtCtx(), ModelPicker(), OpenRouterModel, ProfileLlm, Props

### Community 24 - "ContentModals.tsx"
Cohesion: 0.20
Nodes (9): ACTIVE_STATUSES, AddMaterialModal(), Chapter, Draft, DraftTopic, Modal(), Source, StatusBadge() (+1 more)

### Community 25 - "package.json"
Cohesion: 0.18
Nodes (10): description, tsx@^4.19.2, @types/node@^22.10.5, engines, node, name, private, version (+2 more)

### Community 26 - "subtopic-nav.test.ts"
Cohesion: 0.39
Nodes (6): allQuizzed(), findNextSubtopic(), ProgressMap, SubtopicItem, SubtopicProgressEntry, items

### Community 27 - "chunks/route.ts"
Cohesion: 0.43
Nodes (6): DELETE(), dynamic, GET(), deleteChunk(), getChunk(), listChunks()

### Community 28 - "topics/[id]/route.ts"
Cohesion: 0.47
Nodes (5): DELETE(), dynamic, PATCH(), deleteTopic(), updateTopic()

### Community 29 - "curriculum/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), adminCurriculum()

### Community 30 - "chats/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), adminProfileChats

### Community 31 - "admin/profiles/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), adminListProfiles()

### Community 32 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

### Community 33 - "run-e2e.ts"
Cohesion: 0.83
Nodes (3): check(), cookieFrom(), main()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `getActiveStudent()` to `grade/route.ts`, `llm.ts`, `text/route.ts`, `admin/page.tsx`, `react`, `getSubject()`, `dependencies`, `requireAdmin()`, `select/route.ts`, `learn/page.tsx`, `package.json`, `chunks/route.ts`, `topics/[id]/route.ts`, `curriculum/route.ts`, `chats/route.ts`, `admin/profiles/route.ts`?**
  _High betweenness centrality (0.292) - this node is a cross-community bridge._
- **Should `grade/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06631578947368422 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `prompts.ts` to `grade/route.ts`, `getActiveStudent()`, `llm.ts`, `text/route.ts`, `gamify.ts`, `data.ts`, `seed.ts`, `getSubject()`, `devDependencies`, `MarkdownLite.tsx`, `package.json`, `subtopic-nav.test.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `getActiveStudent()` be split into smaller, more focused modules?**
  _Cohesion score 0.05594679186228482 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `admin/page.tsx`, `gamify.ts`, `learn/page.tsx`, `MarkdownLite.tsx`, `ModelPicker()`, `ContentModals.tsx`, `package.json`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `llm.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08248587570621468 - nodes in this community are weakly interconnected._
- **Should `launch.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08776595744680851 - nodes in this community are weakly interconnected._