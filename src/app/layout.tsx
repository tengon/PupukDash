import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SiPUPUK - Sistem Informasi Penjualan Pupuk Bersubsidi",
  description: "Aplikasi manajemen penjualan pupuk bersubsidi Indonesia - Kementerian Pertanian RI",
  keywords: ["pupuk", "subsidi", "Indonesia", "pertanian", "SiPUPUK"],
  authors: [{ name: "Kementerian Pertanian RI" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "SiPUPUK - Sistem Informasi Penjualan Pupuk Bersubsidi",
    description: "Aplikasi manajemen penjualan pupuk bersubsidi Indonesia",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}