import type { Metadata } from "next";
import "../globals.css";
import { FontLinks } from "@/components/FontLinks";

export const metadata: Metadata = {
  title: { default: "Front desk · Go Padel", template: "%s · Go Padel front desk" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <FontLinks />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
