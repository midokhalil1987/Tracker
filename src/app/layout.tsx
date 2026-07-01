import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DocumentTitle } from "@/components/document-title";
import { ThemeProvider } from "@/components/theme-provider";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { ToastProvider } from "@/components/toast";
import { CommandPaletteProvider } from "@/components/command-palette";
import { RouteScrollRestorer } from "@/components/route-scroll-restorer";
import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { APP_FULL_TITLE, APP_DESCRIPTION } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_FULL_TITLE,
  description: APP_DESCRIPTION,
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
          <ConfirmDialogProvider>
            <ToastProvider>
              <CommandPaletteProvider>
                <AuthProvider>
                  <DocumentTitle />
                  <RouteScrollRestorer />
                  <AppShell>{children}</AppShell>
                </AuthProvider>
              </CommandPaletteProvider>
            </ToastProvider>
          </ConfirmDialogProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
