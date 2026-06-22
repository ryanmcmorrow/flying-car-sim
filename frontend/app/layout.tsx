import type { Metadata } from "next";
import { Press_Start_2P, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-pixel-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flying Car Simulator",
  description: "Multiplayer business strategy simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${shareTechMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
