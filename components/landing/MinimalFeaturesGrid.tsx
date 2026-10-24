'use client';

import { HardDrive, Feather, Search, Share2 } from 'lucide-react';
import Reveal from './Reveal';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    pillLeft: React.ReactNode;
    pillRight: React.ReactNode;
    delay?: number;
}

function FeatureCard({
    icon,
    title,
    description,
    pillLeft,
    pillRight,
    delay = 0,
}: FeatureCardProps) {
    return (
        <Reveal delay={delay}>
            <div className="group h-full p-7 sm:p-8 rounded-2xl bg-[#0d0f17] border border-white/[0.08] hover:border-white/[0.2] transition-all duration-300 flex flex-col justify-between hover:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.7),0_0_20px_rgba(0,229,255,0.06)] hover:-translate-y-0.5">
                <div>
                    {/* Icon container */}
                    <div className="w-10 h-10 rounded-xl bg-[#131722] border border-white/[0.1] flex items-center justify-center text-[#00e5ff] mb-6 group-hover:scale-105 group-hover:border-[#00e5ff]/30 transition-all shadow-[0_0_12px_rgba(0,229,255,0.1)]">
                        {icon}
                    </div>

                    {/* Feature Title */}
                    <h3 className="text-xl font-bold text-white tracking-tight font-sans mb-3">
                        {title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-[#bac9cc] leading-relaxed font-normal">
                        {description}
                    </p>
                </div>

                {/* Bottom Tags / Meta Row */}
                <div className="mt-8 pt-5 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono text-[#849396] gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#131722] border border-white/[0.06]">
                        {pillLeft}
                    </div>
                    <span className="text-[#64748b] text-[11px]">
                        {pillRight}
                    </span>
                </div>
            </div>
        </Reveal>
    );
}

export default function MinimalFeaturesGrid() {
    return (
        <section
            id="features"
            className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-20"
        >
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16">
                <Reveal>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        Everything you need, nothing you don&apos;t.
                    </h2>
                </Reveal>
                <Reveal delay={100}>
                    <p className="mt-4 text-[#bac9cc] text-base sm:text-lg">
                        Thoughtfully designed so writing feels as natural and light as paper.
                    </p>
                </Reveal>
            </div>

            {/* 2x2 Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Feature 1 */}
                <FeatureCard
                    icon={<HardDrive size={18} />}
                    title="Never lose a thought"
                    description="Lose your connection mid-session and your changes stay safe on this device, then sync the moment you're back online."
                    pillLeft={
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                            <span className="text-[#00e5ff]">Offline edits kept</span>
                        </>
                    }
                    pillRight="Syncs when you reconnect"
                    delay={150}
                />

                {/* Feature 2 */}
                <FeatureCard
                    icon={<Feather size={18} />}
                    title="Zero distractions"
                    description="A clean, quiet canvas with nothing to get between you and your words. No complex sessions, badges, or cluttered toolbars."
                    pillLeft={<span className="text-[#e3e2e5]">Clean typographic space</span>}
                    pillRight="Just pure focus"
                    delay={220}
                />

                {/* Feature 3 */}
                <FeatureCard
                    icon={<Search size={18} />}
                    title="Effortless search"
                    description="Press a quick shortcut and find any word, idea, or past note in a heartbeat. Never dig through rigid folder trees again."
                    pillLeft={
                        <span className="text-white font-semibold">⌘ K</span>
                    }
                    pillRight="Instant lookup"
                    delay={290}
                />

                {/* Feature 4 */}
                <FeatureCard
                    icon={<Share2 size={18} />}
                    title="Share with a link"
                    description="Turn any thought, quote, or recipe into a clean secret link with one tap. Keep the rest of your notes completely private."
                    pillLeft={
                        <span className="text-[#00e5ff]">prism.app/s/morning-reflec</span>
                    }
                    pillRight="Private by default"
                    delay={360}
                />
            </div>
        </section>
    );
}
