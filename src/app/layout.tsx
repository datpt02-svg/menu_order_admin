import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Charm,
  Coiny,
  Hachi_Maru_Pop,
} from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const charm = Charm({
  variable: "--font-charm",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
});

const hachiMaruPop = Hachi_Maru_Pop({
  variable: "--font-hachi-maru-pop",
  subsets: ["latin"],
  weight: ["400"],
});

const coiny = Coiny({
  variable: "--font-coiny",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Sam Camping Admin",
  description: "Admin dashboard for booking, waiter requests, tables and services.",
};

import { ToastProvider } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${charm.variable} ${hachiMaruPop.variable} ${coiny.variable} h-full antialiased`}
    >
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
