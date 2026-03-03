import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Bifrost — AI-First BA Documentation",
  description: "Generate implementation-ready BRDs, PRDs, epics, stories, and acceptance criteria with AI.",
  keywords: ["BA documentation", "BRD", "PRD", "agile", "product management", "AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
          <script src="https://apis.google.com/js/api.js" async defer></script>
        </TooltipProvider>
      </body>
    </html>
  );
}
