"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

const FEATURES = [
    {
        id: "01",
        title: "Create at the speed of thought",
        description:
            "Tell Base44 your idea, and watch it transform into a working app with all the building blocks already in place, from beautifully designed pages to user flows and one-click integrations.",
        image:
            "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/Create_20at_20the_20speed_20of_20thought_20-_20Des-1.jpg",
    },
    {
        id: "02",
        title: "A backend that builds with you",
        description:
            "While you shape the idea, Base44 automatically sets up the logic and infrastructure so your app works out of the box. User logins, authentication, data storage, and role-based permissions are generated behind the scenes.",
        image:
            "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/A_20backend_20that_20builds_20with_20you_20-_20Des-2.jpg",
    },
    {
        id: "03",
        title: "Ready to use, instantly",
        description:
            "Our platform comes with built-in hosting, analytics, and custom domains so when your app is ready to go live, all you have to do is press publish.",
        image:
            "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/Ready_20to_20use_2C_20instantly_20-_20Desktop-3.jpg",
    },
    {
        id: "04",
        title: "One platform. Any agent.",
        description:
            "Get access to the latest AI models as they launch. Base44 automatically selects the best model for your project, or you can choose the one that fits your build, your style, and your workflow.",
        image:
            "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/One_20platform__20Any_20agent_20-_20Desktop-4.jpg",
    },
];

export default function FeatureScroller() {
    const [activeIndex, setActiveIndex] = useState(0);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;

            const rect = sectionRef.current.getBoundingClientRect();
            const scrollTop = Math.max(-rect.top, 0);
            const progress = scrollTop / window.innerHeight;
            const newIndex = Math.min(Math.floor(progress), FEATURES.length - 1);
            setActiveIndex(newIndex);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <section ref={sectionRef} className="relative w-full" style={{ height: `${FEATURES.length * 100}vh` }}>
            <div className="sticky top-0 h-screen w-full flex items-center justify-center bg-white">
                <div className="container mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center h-full max-w-[1280px]">
                    {/* Left Column */}
                    <div className="lg:col-span-5 flex flex-col justify-center py-12 lg:py-0 z-10">
                        <h2 className="text-[48px] font-medium leading-[1.1] mb-20 tracking-tight text-black">
                            Consider yourself limitless
                        </h2>
                        <div className="relative h-[320px]">
                            {FEATURES.map((feature, idx) => {
                                const isActive = idx === activeIndex;
                                const isPast = idx < activeIndex;
                                return (
                                    <div
                                        key={feature.id}
                                        className={`absolute top-0 left-0 w-full transition-all duration-700 ease-in-out ${isActive
                                            ? "opacity-100 translate-y-0 pointer-events-auto"
                                            : isPast
                                                ? "opacity-0 -translate-y-12 pointer-events-none"
                                                : "opacity-0 translate-y-12 pointer-events-none"
                                            }`}
                                    >
                                        <div className="flex items-baseline gap-2 mb-6">
                                            <span className="text-[18px] font-semibold text-black">{feature.id}</span>
                                            <span className="text-[18px] font-normal text-[#4A4A4A]/40">/</span>
                                            <span className="text-[18px] font-normal text-[#4A4A4A]/40">04</span>
                                        </div>
                                        <h3 className="text-[32px] font-semibold leading-[1.2] mb-6 text-black">{feature.title}</h3>
                                        <p className="text-[18px] leading-[1.6] text-[#4A4A4A] max-w-[420px]">{feature.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-7 relative h-full flex items-center justify-center pt-20 lg:pt-0">
                        <div className="relative w-full aspect-[16/10] max-w-[800px] rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-[#E5E5E5] bg-white">
                            {FEATURES.map((feature, idx) => {
                                const isActive = idx === activeIndex;
                                const isPast = idx < activeIndex;
                                return (
                                    <div
                                        key={`img-${feature.id}`}
                                        className={`absolute inset-0 rounded-[24px] overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${isActive
                                            ? "opacity-100 translate-y-0 z-10"
                                            : isPast
                                                ? "opacity-50 -translate-y-8 scale-95 z-0"
                                                : "opacity-100 translate-y-full z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]"
                                            }`}
                                    >
                                        <Image src={feature.image} alt={feature.title} fill className="object-cover object-top" priority={idx === 0} sizes="(max-width: 1024px) 100vw, 800px" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}