import { describe, it, expect } from "vitest";
import {
  slugify,
  uniqueSubjectId,
  createSubject,
  createTopics,
  insertKnowledgeChunk,
  getSubject,
  listTopics,
  topicPrerequisites,
  createSource,
  updateSource,
  getSource,
  listSources,
} from "@/lib/data";
import { retrieveContext } from "@/lib/rag";

describe("slugify / uniqueSubjectId", () => {
  it("slugifies names safely", () => {
    expect(slugify("Organic Chemistry!")).toBe("organic-chemistry");
    expect(slugify("  Health & Nutrition  ")).toBe("health-nutrition");
  });

  it("avoids colliding with an existing subject id", () => {
    const id1 = uniqueSubjectId("Chemistry");
    createSubject({ id: id1, name: "Chemistry" });
    const id2 = uniqueSubjectId("Chemistry");
    expect(id1).toBe("chemistry");
    expect(id2).not.toBe(id1);
    expect(id2.startsWith("chemistry")).toBe(true);
  });
});

describe("dynamic subject + topics + chunks", () => {
  it("creates a subject with a topic graph and retrieves its chunks", async () => {
    const id = uniqueSubjectId("Astronomy");
    createSubject({ id, name: "Astronomy", description: "Study of space.", framing: "Use scale analogies." });

    const t0 = `${id}.stars`;
    const t1 = `${id}.galaxies`;
    createTopics([
      { id: t0, subjectId: id, name: "Stars", description: "How stars work.", prerequisites: [], orderIndex: 0 },
      { id: t1, subjectId: id, name: "Galaxies", description: "Collections of stars.", prerequisites: [t0], orderIndex: 1 },
    ]);

    expect(getSubject(id)?.name).toBe("Astronomy");
    const topics = listTopics(id);
    expect(topics.map((t) => t.id)).toEqual([t0, t1]);
    expect(topicPrerequisites(topics[1])).toEqual([t0]);

    // Insert a chunk without an embedding -> retrieval falls back to topic match.
    insertKnowledgeChunk({
      subjectId: id,
      topicId: t0,
      source: "test/astronomy.pdf",
      text: "A star is a luminous sphere of plasma held together by gravity.",
      embedding: null,
    });

    const results = await retrieveContext(id, t0, "what is a star?", 4);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].text).toContain("star");
  });
});

describe("sources lifecycle", () => {
  it("creates, updates, and lists a source", () => {
    const id = uniqueSubjectId("Geology");
    createSubject({ id, name: "Geology" });
    const src = createSource({ subjectId: id, kind: "pdf", name: "rocks.pdf" });
    expect(src.status).toBe("pending");

    updateSource(src.id, { status: "done", chunkCount: 12, embeddedCount: 12 });
    const reloaded = getSource(src.id)!;
    expect(reloaded.status).toBe("done");
    expect(reloaded.chunkCount).toBe(12);

    expect(listSources(id).some((s) => s.id === src.id)).toBe(true);
  });
});
