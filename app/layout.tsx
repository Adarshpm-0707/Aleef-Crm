import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

// ─── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Aleef CRM",
    template: "%s | Aleef CRM",
  },
  description:
    "Aleef CRM — a modern customer relationship management platform for admins, managers and clients.",
  keywords: ["CRM", "customer management", "Aleef", "dashboard"],
  authors: [{ name: "Aleef" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Aleef CRM",
    description: "A modern CRM platform.",
    siteName: "Aleef CRM",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aleef CRM",
    description: "A modern CRM platform.",
  },
  robots: {
    index: false, // flip to true in production
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)",  color: "#0b1120" },
  ],
};

// ─── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}

          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "font-sans text-sm shadow-card border border-border bg-card text-card-foreground",
                title: "font-semibold",
                description: "text-muted-foreground",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
