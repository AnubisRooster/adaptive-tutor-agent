import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { loadEnv, databasePath } from "../lib/config";
import { embed } from "../lib/ollama";
import { SUBJECTS, TOPICS } from "../db/curriculum";

loadEnv();

const uuid = () => crypto.randomUUID();
const now = () => Date.now();

function chunkText(text: string, target = 700, overlap = 120): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > target && buf.length > 0) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

async function main() {
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");

  // --- Upsert subjects ---
  const upsertSubject = sqlite.prepare(
    `INSERT INTO subjects (id, name, description, framing, order_index)
     VALUES (@id, @name, @description, @framing, @orderIndex)
     ON CONFLICT(id) DO UPDATE SET name=@name, description=@description, framing=@framing, order_index=@orderIndex`
  );
  for (const s of SUBJECTS) upsertSubject.run(s);

  // --- Upsert topics ---
  const upsertTopic = sqlite.prepare(
    `INSERT INTO topics (id, subject_id, name, description, prerequisites, order_index)
     VALUES (@id, @subjectId, @name, @description, @prerequisites, @orderIndex)
     ON CONFLICT(id) DO UPDATE SET subject_id=@subjectId, name=@name, description=@description, prerequisites=@prerequisites, order_index=@orderIndex`
  );
  for (const t of TOPICS) {
    upsertTopic.run({ ...t, prerequisites: JSON.stringify(t.prerequisites) });
  }
  console.log(`[seed] ${SUBJECTS.length} subjects, ${TOPICS.length} topics upserted.`);

  // --- Knowledge chunks from content/*.md ---
  const contentDir = path.resolve(process.cwd(), "content");
  sqlite.prepare("DELETE FROM knowledge_chunks").run();

  let totalChunks = 0;
  let embedded = 0;
  let embeddingsWork = true;

  const insertChunk = sqlite.prepare(
    `INSERT INTO knowledge_chunks (id, subject_id, topic_id, source, text, embedding, created_at)
     VALUES (@id, @subjectId, @topicId, @source, @text, @embedding, @createdAt)`
  );

  if (fs.existsSync(contentDir)) {
    for (const subject of SUBJECTS) {
      const dir = path.join(contentDir, subject.id);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
      for (const fileName of files) {
        const slug = fileName.replace(/\.md$/, "");
        const topicId = `${subject.id}.${slug}`;
        const known = TOPICS.find((t) => t.id === topicId);
        const raw = fs.readFileSync(path.join(dir, fileName), "utf8");
        const chunks = chunkText(raw);
        for (const chunk of chunks) {
          let embedding: string | null = null;
          if (embeddingsWork) {
            const vec = await embed(chunk);
            if (vec) {
              embedding = JSON.stringify(vec);
              embedded++;
            } else {
              embeddingsWork = false; // stop trying after first failure
            }
          }
          insertChunk.run({
            id: uuid(),
            subjectId: subject.id,
            topicId: known ? topicId : null,
            source: `${subject.name} / ${fileName}`,
            text: chunk,
            embedding,
            createdAt: now(),
          });
          totalChunks++;
        }
      }
    }
  }

  sqlite.close();
  console.log(`[seed] ${totalChunks} knowledge chunks inserted (${embedded} embedded).`);
  if (totalChunks > 0 && embedded === 0) {
    console.warn(
      "[seed] No embeddings were created (is Ollama running and is the embed model pulled?). RAG will fall back to topic-matched chunks until you re-run `npm run seed`."
    );
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
