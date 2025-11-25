import type { Metadata } from "next";
import { AppProviders } from "@/src/contexts";
import { CorrelationProvider } from "@/src/contexts/correlation-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Administration",
  description: "A modern realtime application built with Next.js and Pinot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme-store');
                  if (theme) {
                    const parsed = JSON.parse(theme);
                    // Zustand persist stores data as { state: {...}, version: number }
                    const mode = parsed.state?.mode || 'system';
                    let resolvedMode = mode;

                    if (mode === 'system') {
                      resolvedMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }

                    // Apply the resolved theme immediately
                    if (resolvedMode === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                    document.documentElement.setAttribute('data-theme', resolvedMode);
                  } else {
                    // Default to system preference if no stored theme
                    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (systemPrefersDark) {
                      document.documentElement.classList.add('dark');
                      document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                      document.documentElement.setAttribute('data-theme', 'light');
                    }
                  }
                } catch (e) {
                  // Fallback to system preference on error
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (systemPrefersDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className="font-arial antialiased min-h-screen bg-background"
      >
        <CorrelationProvider>
          <AppProviders>
            {children}
          </AppProviders>
        </CorrelationProvider>
      </body>
    </html>
  );
}
