import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const DESCRIPTION =
  "Notes that sync live across your devices. Write, tag, search and share.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  // A template rather than a fixed string, so every route contributes its own
  // title and a shared link shows what it actually points at.
  title: { default: "Slate — realtime notes", template: "%s · Slate" },
  description: DESCRIPTION,
  applicationName: "Slate",
  openGraph: {
    type: "website",
    siteName: "Slate",
    title: "Slate — realtime notes",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Slate — realtime notes",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  // Both themes declared, so form controls and the URL bar follow the theme
  // the user is actually in rather than always rendering light.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
