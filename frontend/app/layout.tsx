import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Immigration Form Portal",
  description: "Complete your immigration paperwork securely",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
