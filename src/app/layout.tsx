import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Leaf } from 'lucide-react'

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
    icon: "/images/sipupuk-icon.png"
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var e=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light';document.documentElement.classList.add(e)}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}