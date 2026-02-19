
import type { Metadata } from "next";
import { Toaster } from "sonner";
import NextTopLoader from 'nextjs-toploader';
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Administrative Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`antialiased min-h-screen bg-background text-foreground`}
      >
        <NextTopLoader color={'#FF6B35'} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
