import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { MascotProvider } from "@/components/MascotProvider";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raven for Research",
  description: "Save, organize, and interrogate your research.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <body className="flex min-h-screen bg-bg text-cream">
        <MascotProvider>
          <Sidebar />
          <main className="flex-1 min-w-0 px-10 py-10">{children}</main>
        </MascotProvider>
      </body>
    </html>
  );
}
