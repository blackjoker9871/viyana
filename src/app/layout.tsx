import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viyana | Aethel Solutions",
  description: "Advanced AI Agent for Sales, Marketing, Personal Assistance, and Fact Checking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </body>
    </html>
  );
}
