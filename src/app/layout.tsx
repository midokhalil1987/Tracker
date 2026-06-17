import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { DocumentTitle } from "@/components/document-title";
import { ThemeProvider } from "@/components/theme-provider";
import { DataSync } from "@/components/data-sync";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tempo · Time Tracker",
  description:
    "A simple, modern time tracker for projects, tasks and reports.",
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
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <ThemeProvider>
          <DocumentTitle />
          <DataSync />
          <div className="flex h-svh overflow-hidden">
            <Sidebar />
            <main className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden pb-16 md:pb-0">
              {children}
            </main>
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
