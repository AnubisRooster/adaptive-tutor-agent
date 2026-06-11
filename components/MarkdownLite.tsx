"use client";

import React from "react";
import katex from "katex";
import "katex/contrib/mhchem"; // registers \ce{...} and \pu{...} (must come after katex)
import "katex/dist/katex.min.css";

// A tiny, dependency-light markdown renderer: fenced code blocks, bullet/numbered
// lists, headings, inline `code`, **bold**, and math/chemistry via KaTeX (with the
// mhchem extension). Math is written with \( \) inline, \[ \] display, $…$ / $$…$$,
// or bare \ce{…} for chemistry.

// ── Render helpers ─────────────────────────────────────────────────────────

function mathHtml(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: "ignore",
      // HTML-only: the MathML copy KaTeX emits with "htmlAndMathml" is an
      // absolutely-positioned element that escapes ancestor overflow:hidden
      // (no positioned ancestor in the chat bubbles), inflating page height.
      output: "html",
    });
  } catch {
    return "";
  }
}

// ── normalizeMath ───────────────────────────────────────────────────────────
// The model sometimes double-wraps math: $\( … \)$ or $\[ … \]$. Strip the
// outer $ so KaTeX only sees the real delimiters. Also cleans up the common
// mis-use of $\text{X}$ for plain element labels.
function normalizeMath(input: string): string {
  let out = input;
  // $\( … \)$ → \( … \)  (double-wrapped inline)
  out = out.replace(/\$\\\(([\s\S]*?)\\\)\$/g, "\\($1\\)");
  // $\[ … \]$ → \[ … \]  (double-wrapped display)
  out = out.replace(/\$\\\[([\s\S]*?)\\\]\$/g, "\\[$1\\]");
  // $\ce{…}$ → \ce{…}
  out = out.replace(/\$(\\ce\{[\s\S]*?\})\$/g, "$1");
  // $\pu{…}$ → \pu{…}
  out = out.replace(/\$(\\pu\{[\s\S]*?\})\$/g, "$1");
  // $\text{X}$ → X  (plain-text label wrapped in unnecessary math)
  out = out.replace(/\$\\text\{([^}]*)\}\$/g, "$1");
  // $ ext{X}$  → X  (\t was decoded as a tab; the backslash+t got mangled)
  // Covers: "$<tab>ext{X}$" or "$ ext{X}$" (space-before-ext variant)
  out = out.replace(/\$[\t ]ext\{([^}]*)\}\$/g, "$1");
  return out;
}

// ── tokenizeMath ────────────────────────────────────────────────────────────
// Split a string into plain-text and math tokens. Precedence (highest first):
//   $$…$$, \[…\] (display); \(…\), $…$ (inline); balanced \ce{…}, \pu{…}.
type MathToken = { type: "text"; value: string } | { type: "math"; value: string; display: boolean };

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

    // Inline $…$ — require a closing $ on the same line with non-empty content
    // and no space adjacent to the delimiters.
    if (input[i] === "$") {
      const end = input.indexOf("$", i + 1);
      if (end !== -1) {
        const inner = input.slice(i + 1, end);
        const looksLikeMath =
          inner.length > 0 && !inner.includes("\n") && !/^\s|\s$/.test(inner);
        if (looksLikeMath && closeOf("$", "$", false)) continue;
      }
    }

    buf += input[i];
    i++;
  }
  flush();
  return tokens;
}

// ── renderMath: convert tokenizeMath tokens to React nodes ──────────────────
function renderMathTokens(tokens: MathToken[], keyBase: string): React.ReactNode[] {
  return tokens.flatMap((tok, ti) => {
    if (tok.type === "math") {
      const html = mathHtml(tok.value, tok.display);
      if (html) {
        return [
          <span
            key={`${keyBase}-m${ti}`}
            className={tok.display ? "katex-block" : ""}
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        ];
      }
      return [<code key={`${keyBase}-mf${ti}`} className="inline">{tok.value}</code>];
    }
    return tok.value ? [<React.Fragment key={`${keyBase}-t${ti}`}>{tok.value}</React.Fragment>] : [];
  });
}

// ── renderSegment: process a plain-text segment (no bold/code) through math ─
function renderSegment(text: string, keyBase: string): React.ReactNode[] {
  return renderMathTokens(tokenizeMath(text), keyBase);
}

// ── renderCodeAndMath: split on `code` spans, then math each piece ──────────
function renderCodeAndMath(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const codeParts = text.split(/(`[^`\n]+`)/g);
  codeParts.forEach((part, ci) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      nodes.push(
        <code className="inline" key={`${keyBase}-c${ci}`}>
          {part.slice(1, -1)}
        </code>
      );
    } else if (part) {
      renderSegment(part, `${keyBase}-c${ci}`).forEach((n) => nodes.push(n));
    }
  });
  return nodes;
}

// ── renderInline: bold → code → math (highest-level pass first) ─────────────
// Parsing bold BEFORE math means **…** spanning math tokens renders correctly.
function renderInline(rawText: string, keyBase: string): React.ReactNode[] {
  const text = normalizeMath(rawText);
  const nodes: React.ReactNode[] = [];

  // Split on **bold** runs. Allow anything inside except a bare ** (non-greedy).
  const parts = text.split(/(\*\*(?:[^*]|\*(?!\*))+\*\*)/g);
  parts.forEach((part, bi) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      const inner = part.slice(2, -2);
      nodes.push(
        <strong key={`${keyBase}-b${bi}`}>
          {renderCodeAndMath(inner, `${keyBase}-b${bi}`)}
        </strong>
      );
    } else if (part) {
      renderCodeAndMath(part, `${keyBase}-t${bi}`).forEach((n) => nodes.push(n));
    }
  });
  return nodes;
}

// ── MarkdownLite component ──────────────────────────────────────────────────

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
      if (text)
        blocks.push(
          <p key={`p-${idx}-${blocks.length}`}>
            {renderInline(text, `p-${idx}-${blocks.length}`)}
          </p>
        );
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
        const HTag = (
          level === 1 ? "h1" : level === 2 ? "h2" : "h3"
        ) as keyof React.JSX.IntrinsicElements;
        blocks.push(
          <HTag key={`h-${idx}-${blocks.length}`}>
            {renderInline(heading[2], `h-${idx}`)}
          </HTag>
        );
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
