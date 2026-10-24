import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import WaterGlassNav from '@/components/landing/WaterGlassNav';
import LandingBackground from '@/components/landing/LandingBackground';
import WaterGlassHero from '@/components/landing/WaterGlassHero';
import MinimalFeaturesGrid from '@/components/landing/MinimalFeaturesGrid';
import MinimalClosingCTA from '@/components/landing/MinimalClosingCTA';
import MinimalLandingFooter from '@/components/landing/MinimalLandingFooter';

export const metadata = {
    title: 'Prism — A calm place for all your thoughts',
    description:
        'A distraction-free notebook that stays in sync across all your devices. Simple, fast, and completely yours.',
    openGraph: {
        title: 'Prism — A calm place for all your thoughts',
        description:
            'A distraction-free notebook that stays in sync across all your devices. Simple, fast, and completely yours.',
    },
};

/**
 * Isolated Suspense boundary for auth check to keep initial page paint instant.
 */
async function NavWithAuth() {
    try {
        if (
            !process.env.NEXT_PUBLIC_SUPABASE_URL ||
            !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ) {
            return <WaterGlassNav isSignedIn={false} />;
        }
        const supabase = await createClient();
        const { data } = await supabase.auth.getClaims();
        return <WaterGlassNav isSignedIn={!!data?.claims?.sub} />;
    } catch {
        return <WaterGlassNav isSignedIn={false} />;
    }
}

export default function Home() {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#090a0f] text-[#e3e2e5] antialiased selection:bg-[#00e5ff] selection:text-[#090a0f]">
            {/* Ambient dynamic glow & film-grain overlay */}
            <LandingBackground />

            {/* Floating Water Glass Island Pill Navigation */}
            <Suspense fallback={<WaterGlassNav isSignedIn={false} />}>
                <NavWithAuth />
            </Suspense>

            {/* Main content sections matching Stitch design */}
            <main className="relative z-10">
                {/* Hero section with interactive editor preview */}
                <WaterGlassHero />

                {/* 2x2 Bento Features Grid */}
                <MinimalFeaturesGrid />

                {/* Closing CTA */}
                <MinimalClosingCTA />
            </main>

            {/* Clean Minimalist Footer */}
            <MinimalLandingFooter />
        </div>
    );
}
