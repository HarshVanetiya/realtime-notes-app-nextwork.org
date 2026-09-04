import type { NextConfig } from "next";

// Note images are served from Supabase Storage. Derive the host from the same
// env var the client uses rather than hard-coding a project URL, so previews,
// staging and production all work without config drift.
function supabaseImagePatterns() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    return [
      {
        protocol: "https" as const,
        hostname: new URL(url).hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    // A malformed URL shouldn't take the whole build down; images just fall
    // back to being unoptimized-and-blocked, which is loud enough to notice.
    return [];
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  // @blocknote/server-util depends on @blocknote/react, which calls
  // React.createContext. Bundled into a Server Component it resolves React
  // under the react-server condition, where createContext does not exist.
  // Keeping it external makes it a plain runtime require with normal Node
  // resolution.
  serverExternalPackages: ["@blocknote/server-util"],
  images: {
    remotePatterns: supabaseImagePatterns(),
  },
};

export default nextConfig;
