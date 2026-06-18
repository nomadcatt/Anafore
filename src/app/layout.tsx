import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${brand.gameTitle} · ${brand.companyName}`,
  description: brand.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-brand-border bg-brand-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              {brand.logoSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoSrc}
                  alt={brand.companyName}
                  style={{ height: brand.logoHeight }}
                  className="w-auto"
                />
              )}
              {!brand.logoIncludesName && (
                <span className="text-lg font-bold tracking-tight">
                  {brand.companyName}
                </span>
              )}
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link
                href="/submit"
                className="rounded-full px-3 py-1.5 text-brand-muted transition hover:bg-brand-bg hover:text-brand-ink"
              >
                Submit
              </Link>
              <Link
                href="/play"
                className="btn-primary rounded-full px-4 py-1.5"
              >
                Play
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-brand-border py-6 text-center text-xs text-brand-muted">
          {brand.gameTitle} · made for {brand.companyName} all-hands 🎉
        </footer>
      </body>
    </html>
  );
}
