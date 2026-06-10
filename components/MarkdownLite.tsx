"use client";

import React from "react";
import katex from "katex";
import "katex/contrib/mhchem"; // registers \ce{...} and \pu{...} (must come after katex)
import "katex/dist/katex.min.css";

// A tiny, dependency-light markdown renderer: fenced code blocks, bullet/numbered
// lists, headings, inline `code`, **bold**, and math/chemistry via KaTeX (with the
// mhchem extension). Math is written with \( \) inline, \[ \] display, $…$ / $$…$$,
// or bare \ce{…} for chemistry. Builds React nodes (KaTeX HTML is sanitized output).

function mathHtml(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
    });
  } catch {
    return "";
  }
}

type MathToken = { type: "text"; value: string } | { type: "math"; value: string; display: boolean };

// Split a string into plain-text and math tokens. Recognizes (in priority order):
// $$…$$, \[…\] (display); \(…\), $…$ (inline); and balanced \ce{…} (inline).
function tokenizeMath(input: string): MathToken[] {
  const tokens: MathToken[] = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (buf) tokens.push({ type: "text", value: buf });
    buf = "";
  };
  const closeOf = (open: string, close: string, display: boolean): boolean => {
    const end = input.indexOf(close, i + open.length);
    if (end === -1) return false;
    const inner = input.slice(i + open.length, end);
    flush();
    tokens.push({ type: "math", value: inner, display });
    i = end + close.length;
    return true;
  };

  while (i < input.length) {
    if (input.startsWith("$$", i) && closeOf("$$", "$$", true)) continue;
    if (input.startsWith("\\[", i) && closeOf("\\[", "\\]", true)) continue;
    if (input.startsWith("\\(", i) && closeOf("\\(", "\\)", false)) continue;

    // Bare \ce{...} / \pu{...}: match the balanced closing brace.
    if (input.startsWith("\\ce{", i) || input.startsWith("\\pu{", i)) {
      let depth = 0;
      let j = i + 3; // points at the opening '{'
      for (; j < input.length; j++) {
        if (input[j] === "{") depth++;
        else if (input[j] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      if (j < input.length) {
        flush();
        tokens.push({ type: "math", value: input.slice(i, j + 1), display: false });
        i = j + 1;
        continue;
      }
    }

    // Inline $…$ — require a closing $ on the same line and non-empty content that
    // isn't obviously currency (e.g. "$5" or "$5 and $10").
    if (input[i] === "$") {
      const end = input.indexOf("$", i + 1);
      if (end !== -1) {
        const inner = input.slice(i + 1, end);
        const looksLikeMath = inner.length > 0 && !inner.includes("\n") && !/^\s|\s$/.test(inner) && !/^\d[\d.,]*$/.test(inner);
        if (looksLikeMath && closeOf("$", "$", false)) continue;
      }
    }

    buf += input[i];
    i++;
  }
  flush();
  return tokens;
}

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  tokenizeMath(text).forEach((tok, ti) => {
    if (tok.type === "math") {
      const html = mathHtml(tok.value, tok.display);
      if (html) {
        nodes.push(
          <span
            key={`${keyBase}-m${ti}`}
            className={tok.display ? "katex-block" : ""}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } else {
        nodes.push(<code key={`${keyBase}-mf${ti}`} className="inline">{tok.value}</code>);
      }
      return;
    }
    // Plain text: render inline `code` then **bold**.
    const parts = tok.value.split(/(`[^`]+`)/g);
    parts.forEach((part, i) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
        nodes.push(
          <code className="inline" key={`${keyBase}-${ti}-c${i}`}>
            {part.slice(1, -1)}
          </code>
        );
        return;
      }
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      boldParts.forEach((bp, j) => {
        if (bp.startsWith("**") && bp.endsWith("**") && bp.length > 2) {
          nodes.push(<strong key={`${keyBase}-${ti}-b${i}-${j}`}>{bp.slice(2, -2)}</strong>);
        } else if (bp) {
          nodes.push(<React.Fragment key={`${keyBase}-${ti}-t${i}-${j}`}>{bp}</React.Fragment>);
        }
      });
    });
  });
  return nodes;
}

export default function MarkdownLite({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const segments = content.split(/```/);

  segments.forEach((seg, idx) => {
    const isCode = idx % 2 === 1;
    if (isCode) {
      const firstNewline = seg.indexOf("\n");
      const code = firstNewline >= 0 ? seg.slice(firstNewline + 1) : seg;
      blocks.push(
        <pre key={`code-${idx}`}>
          <code>{code.replace(/\n$/, "")}</code>
        </pre>
      );
      return;
    }

    const lines = seg.split(/\n/);
    let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
    let paraBuffer: string[] = [];

    const flushPara = () => {
      const text = paraBuffer.join(" ").trim();
      if (text) blocks.push(<p key={`p-${idx}-${blocks.length}`}>{renderInline(text, `p-${idx}-${blocks.length}`)}</p>);
      paraBuffer = [];
    };
    const flushList = () => {
      if (!listBuffer) return;
      const Tag = listBuffer.type;
      const buf = listBuffer;
      blocks.push(
        <Tag key={`l-${idx}-${blocks.length}`}>
          {buf.items.map((it, i) => (
            <li key={i}>{renderInline(it, `li-${idx}-${i}`)}</li>
          ))}
        </Tag>
      );
      listBuffer = null;
    };

    for (const line of lines) {
      const bullet = line.match(/^\s*[-*]\s+(.*)$/);
      const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
      const heading = line.match(/^\s*(#{1,3})\s+(.*)$/);
      if (heading) {
        flushPara();
        flushList();
        const level = heading[1].length;
        const HTag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as keyof React.JSX.IntrinsicElements;
        blocks.push(<HTag key={`h-${idx}-${blocks.length}`}>{renderInline(heading[2], `h-${idx}`)}</HTag>);
      } else if (bullet) {
        flushPara();
        if (!listBuffer || listBuffer.type !== "ul") {
          flushList();
          listBuffer = { type: "ul", items: [] };
        }
        listBuffer.items.push(bullet[1]);
      } else if (numbered) {
        flushPara();
        if (!listBuffer || listBuffer.type !== "ol") {
          flushList();
          listBuffer = { type: "ol", items: [] };
        }
        listBuffer.items.push(numbered[1]);
      } else if (line.trim() === "") {
        flushPara();
        flushList();
      } else {
        flushList();
        paraBuffer.push(line.trim());
      }
    }
    flushPara();
    flushList();
  });

  return <div className="prose-tutor">{blocks}</div>;
}
