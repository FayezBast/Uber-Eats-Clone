import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";

import "./globals.css";

export const metadata: Metadata = {
  title: "Savora",
  description: "Premium food delivery with polished ordering, delivery tracking, and account flows."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <Navbar />
          <main className="page-shell">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
