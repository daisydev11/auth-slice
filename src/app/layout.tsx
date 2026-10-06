import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Auth Slice" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="card">{children}</main>
      </body>
    </html>
  );
}
