import type { Metadata } from "next";
import "@livekit/components-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Interviewer",
  description: "Conduct and evaluate interviews with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-void text-[#e8e4dc] min-h-screen font-mono">{children}</body>
    </html>
  );
}
