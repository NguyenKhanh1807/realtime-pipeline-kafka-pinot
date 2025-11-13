import type { Metadata } from "next";
import { Literata } from "next/font/google";
import { AppProviders } from "@/src/contexts";
import { CorrelationProvider } from "@/src/contexts/correlation-context";
import { Toaster } from "@/src/components";
import "./globals.css";

// Configure Literata font as per typography guide
const literata = Literata({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-literata",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Realtime Pinot",
  description: "A modern realtime application built with Next.js and Pinot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Always apply dark theme
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
                document.documentElement.setAttribute('data-theme', 'dark');
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${literata.variable} font-literata antialiased min-h-screen bg-background`}
      >
        <CorrelationProvider>
          <AppProviders>
            {children}
            <Toaster />
          </AppProviders>
        </CorrelationProvider>
      </body>
    </html>
  );
}
