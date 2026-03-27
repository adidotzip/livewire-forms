import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forums",
  description: "Premium forum UI theme",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
