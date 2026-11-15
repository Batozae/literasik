import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  fallback: ["sans-serif"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Literasik",
  description: "Asesmen literasi digital untuk siswa dan guru.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased tabular-nums">
        {children}
      </body>
    </html>
  );
}
