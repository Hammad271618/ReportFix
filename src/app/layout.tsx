import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReportFix — Campus Issue Triage & Verification",
  description:
    "Campus facilities and safety dispatch console with multilingual intake, deduplication, and community verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased bg-[#f7f7f6] text-[#171717]`}
    >
      <body
        className={`${instrumentSans.className} min-h-full flex flex-col bg-[#f7f7f6] text-[#171717] selection:bg-[#0f766e]/15 selection:text-[#0f766e]`}
      >
        {children}
      </body>
    </html>
  );
}
