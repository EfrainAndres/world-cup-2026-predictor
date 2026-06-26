import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "../src/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup 2026 Predictor",
  description: "Transparent football prediction dashboard foundation for World Cup 2026."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
