import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "JobCompass — AI-Powered Job Hunting",
  description:
    "JobCompass finds relevant jobs, scores each one against your profile, and researches companies — so you apply with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="font-sans min-h-full flex flex-col">
          <PostHogProvider>{children}</PostHogProvider>
        </body>
    </html>
  );
}
