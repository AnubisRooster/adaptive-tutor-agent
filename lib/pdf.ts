import { extractText, getDocumentProxy } from "unpdf";

export type ExtractedPdf = {
  text: string;
  pageCount: number;
};

/**
 * Extract plain text from a PDF buffer using unpdf (bundles pdf.js, pure JS,
 * no native build, so it runs identically on macOS and Windows).
 *
 * pdf.js emits one string per page with little structural whitespace, so we
 * join pages with blank lines. That gives the paragraph-aware chunker
 * (lib/chunk.ts) sensible boundaries to split on.
 */
export async function extractPdfText(buffer: ArrayBuffer | Uint8Array): Promise<ExtractedPdf> {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const joined = pages
    .map((p) => (p || "").replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean)
    .join("\n\n");
  return { text: joined, pageCount: totalPages };
}
