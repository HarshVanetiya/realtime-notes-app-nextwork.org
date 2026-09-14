import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import LandingNav from '@/components/landing/LandingNav';
import LandingBackground from '@/components/landing/LandingBackground';
import HeroSection from '@/components/landing/HeroSection';
import ProofStrip from '@/components/landing/ProofStrip';
import SyncEngineSection from '@/components/landing/SyncEngineSection';
import CapabilitiesBento from '@/components/landing/CapabilitiesBento';
import HowItWorksLoop from '@/components/landing/HowItWorksLoop';
import ClosingCTA from '@/components/landing/ClosingCTA';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata = {
    title: 'Prism — notes at the speed of thought',
    description:
        'A realtime notebook that syncs the instant you type, keeps writing when you are offline, and publishes a single note with a link.',
    openGraph: {
        title: 'Prism — notes at the speed of thought',
        description:
            'A realtime notebook that syncs the instant you type, keeps writing when you are offline, and publishes a single note with a link.',
    },
};

/**
 * The only part of this page that touches the network. Isolated in its own
 * Suspense boundary so everything else prerenders as static HTML — a landing
 * page that waits on an auth round trip before painting has already lost.
 */
async function NavWithAuth() {
    try {
        if (
            !process.env.NEXT_PUBLIC_SUPABASE_URL ||
            !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ) {
            return <LandingNav isSignedIn={false} />;
        }
        const supabase = await createClient();
        const { data } = await supabase.auth.getClaims();
        return <LandingNav isSignedIn={!!data?.claims?.sub} />;
    } catch {
        return <LandingNav isSignedIn={false} />;
    }
}

export default function Home() {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#0d0e10] text-[#e3e2e4] antialiased selection:bg-[#00e5ff] selection:text-[#00363d]">
            {/* Ambient dynamic glow & film-grain overlay */}
            <LandingBackground />

            {/* Fixed Architectural Topbar */}
            <Suspense fallback={<LandingNav isSignedIn={false} />}>
                <NavWithAuth />
            </Suspense>

            {/* Main content landmark */}
            <main className="relative z-10">
                {/* 00 // Canvas — Hero Section */}
                <HeroSection />

                {/* Proof & Benchmark Ticker */}
                <ProofStrip />

                {/* 01 // Engine — Dual-Device Sync Engine Room */}
                <SyncEngineSection />

                {/* 02 // Specs — Capabilities Bento Grid */}
                <CapabilitiesBento />

                {/* 03 // Loop — How It Works Loop */}
                <HowItWorksLoop />

                {/* Closing Conversion CTA */}
                <ClosingCTA />
            </main>

            {/* Minimal Architectural Monolithic Footer */}
            <LandingFooter />
        </div>
    );
}
