import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LEAGUE } from "@/data/league";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: `${LEAGUE.name} · ${LEAGUE.season}`,
    template: `%s · ${LEAGUE.name}`,
  },
  description: `Standings, schedule, teams, rules and bylaws for the ${LEAGUE.name} at ${LEAGUE.course}.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
