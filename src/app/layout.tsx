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
  themeColor: "#08090a",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-black text-[#f5f5f7] font-sans selection:bg-zinc-800 selection:text-white">
        <MultiplayerProvider><StoreProvider>{children}</StoreProvider></MultiplayerProvider>
      </body>
    </html>
  );
}
