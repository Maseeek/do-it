import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { MultiplayerProvider } from "@/lib/multiplayer";

const geistSans = localFont({
  src: './fonts/geist-latin.woff2',
  variable: "--font-geist-sans",
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/geist-mono-latin.woff2',
  variable: "--font-geist-mono",
  weight: '100 900',
});

export const metadata: Metadata = {
  title: "do: habit tracker",
  description: "Minimalist habit tracker and daily accountability.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "do",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var pref = localStorage.getItem('theme_preference') || 'system';
                var isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                var doc = document.documentElement;
                if (isDark) {
                  doc.classList.add('dark');
                  doc.classList.remove('light');
                  doc.style.colorScheme = 'dark';
                } else {
                  doc.classList.remove('dark');
                  doc.classList.add('light');
                  doc.style.colorScheme = 'light';
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans transition-colors duration-150">
        <MultiplayerProvider>
          <StoreProvider>{children}</StoreProvider>
        </MultiplayerProvider>
      </body>
    </html>
  );
}
