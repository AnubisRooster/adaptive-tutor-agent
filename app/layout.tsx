import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Tutor",
  description: "A local, adaptive personal tutor for Philosophy, Psychology, AI, Physics, and Coding.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Inline script applied before first paint so the correct theme class is set
// on <html> with no flash. Reads localStorage first (set on toggle), then
// falls back to the OS preference.
const themeScript = `(function(){
  try {
    var stored = localStorage.getItem('theme');
    var cls = stored === 'light' ? 'light'
            : stored === 'dark'  ? 'dark'
            : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.classList.add(cls);
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional no-flash theme init */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
