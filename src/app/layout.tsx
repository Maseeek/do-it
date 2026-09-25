import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Do It — Couples Habit Duel",
  description: "Minimalist couples habit tracking and accountability duel for Maciek & Myrna.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Do It",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <div className="ambient-mesh" />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
