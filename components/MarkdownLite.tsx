"use client";

import React from "react";

// A tiny, dependency-free markdown renderer: fenced code blocks, bullet/numbered
// lists, inline `code`, and **bold**. Builds React nodes (no dangerouslySetInnerHTML).

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on inline code first.
  const parts = text.split(/(`[^`]+`)/g);
  parts.forEach((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      nodes.push(
        <code className="inline" key={`${keyBase}-c${i}`}>
          {part.slice(1, -1)}
        </code>
      );
      return;
    }
    // Bold within the remaining text.
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((bp, j) => {
      if (bp.startsWith("**") && bp.endsWith("**") && bp.length > 2) {
        nodes.push(<strong key={`${keyBase}-b${i}-${j}`}>{bp.slice(2, -2)}</strong>);
      } else if (bp) {
        nodes.push(<React.Fragment key={`${keyBase}-t${i}-${j}`}>{bp}</React.Fragment>);
      }
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
