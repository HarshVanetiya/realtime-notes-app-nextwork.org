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
  title: { default: "Prism — notes at the speed of thought", template: "%s · Prism" },
  description: DESCRIPTION,
  applicationName: "Prism",
  openGraph: {
    type: "website",
    siteName: "Prism",
    title: "Prism — notes at the speed of thought",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Prism — notes at the speed of thought",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  // Both themes declared, so form controls and the URL bar follow the theme
  // the user is actually in rather than always rendering light.
  themeColor: [
    // Matches --background in globals.css: warm off-white / VS Code gray.
    { media: "(prefers-color-scheme: light)", color: "#f8f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1e21" },
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
      <head>
        {/* Paints the user's accent and layout BEFORE the first frame.
            Without it every cold load shows the default blue and then snaps to
            whatever they chose — a flash on every navigation.

            Contains no colour logic on purpose. lib/preferences.ts derives both
            themes' variables when a preference is saved and stores the finished
            key/value pairs in the mirror, so this only reads and applies them.
            A second copy of the derivation inlined here would be a maintenance
            hazard whose only symptom is the first frame of a cold load — the
            hardest place to notice a drift.

            Wrapped in try/catch throughout: blocked storage or a corrupt value
            must lose the personalisation, never the page. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var m=JSON.parse(localStorage.getItem('prism:appearance')||'null');
              if(!m)return;
              var t=m.theme;
              if(t==='system'||!t){
                t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
              }
              var v=(m.vars||{})[t]||{};
              var el=document.documentElement;
              for(var k in v){if(k.indexOf('--')===0)el.style.setProperty(k,String(v[k]));}
              if(m.layout)el.dataset.layout=m.layout;
              if(m.density)el.dataset.density=m.density;
            }catch(e){}})();`,
          }}
        />
      </head>
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
