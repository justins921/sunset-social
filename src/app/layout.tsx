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

// Runs before paint to apply the saved theme, so there is no flash of the wrong
// palette on load. Falls back to the OS preference when nothing is stored.
const themeScript = `(function(){try{var t=localStorage.getItem('ss-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
