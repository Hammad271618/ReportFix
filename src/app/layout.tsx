import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReportFix — Campus Issue Triage & Verification",
  description:
    "Campus facilities and safety triage console with semantic intake and deterministic routing, trust, and verification rules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#f5f7fa] text-[#111827]`}
    >
      <body className="min-h-full flex flex-col bg-[#f5f7fa] text-[#111827]">
        {children}
      </body>
    </html>
  );
}
