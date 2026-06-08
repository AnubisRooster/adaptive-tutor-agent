import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownLite from "@/components/MarkdownLite";

function render(content: string): string {
  return renderToStaticMarkup(<MarkdownLite content={content} />);
}

describe("MarkdownLite", () => {
  it("renders bold and inline code", () => {
    const html = render("This is **bold** and `code` text.");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("code");
    expect(html).toContain('class="inline"');
  });

  it("renders fenced code blocks", () => {
    const html = render("Here:\n\n```js\nconst x = 1;\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("const x = 1;");
  });

  it("renders bullet lists", () => {
    const html = render("- one\n- two\n- three");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>three</li>");
  });

  it("renders numbered lists", () => {
    const html = render("1. first\n2. second");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
  });

  it("renders headings", () => {
    const html = render("## Section title");
    expect(html).toContain("<h2>Section title</h2>");
  });
});
