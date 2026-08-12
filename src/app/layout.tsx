import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { PwaRegistry } from "@/components/PwaRegistry";
import OfflineBanner from "@/components/OfflineBanner";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ContriTrack | Academic Collaboration & Contribution Analytics",
  description: "Because group projects deserve accountability. Track real contributions, GitHub activity, team collaboration, and project performance with beautiful proof-based reports and analytics.",
  keywords: ["academic collaboration", "contribution tracking", "git dashboard", "group projects", "student accountability", "peer reviews", "professor dashboard"],
  appleWebApp: {
    capable: true,
    title: "ContriTrack",
    statusBarStyle: "black-translucent"
  }
};

export const viewport = {
  themeColor: "#1b1c2b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-[#1b1c2b] text-white selection:bg-[#F2C1A3] selection:text-[#1b1c2b] overflow-x-hidden" suppressHydrationWarning>
        <AuthProvider>
          <NextTopLoader color="#F2C1A3" showSpinner={false} height={3} />
          <PwaRegistry />
          <OfflineBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
