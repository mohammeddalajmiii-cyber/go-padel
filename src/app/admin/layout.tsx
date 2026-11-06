import type { Metadata } from "next";
import "../globals.css";
import { SiteFontLinks } from "@/components/SiteFontLinks";

export const metadata: Metadata = {
  title: { default: "Front desk · Go Padel", template: "%s · Go Padel front desk" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <SiteFontLinks />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="gp-admin min-h-dvh">{children}</body>
    </html>
  );
}
