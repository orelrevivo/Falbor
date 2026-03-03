"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Hammer, Wrench, Cpu, Layout, Layers, Sparkles, Building2, Code2, MonitorCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ApplicationPreview = () => {
    const [activeTab, setActiveTab] = useState<"prompt" | "builder">("prompt");
    const [isBuilding, setIsBuilding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [buildStage, setBuildStage] = useState("");

    const appTemplates = [
        {
            id: "inventory",
            name: "Inventory Management App",
            url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/1__20Inventory_20Management_20App-5.jpg",
        },
        {
            id: "finances",
            name: "Finances",
            url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/2__20Finances-7.jpg",
        },
        {
            id: "treks",
            name: "Treks Planner App",
            url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/3__20Treks_20Planner_20App-9.jpg",
        },
        {
            id: "meal",
            name: "Meal Planner App",
            url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/4__20Meal_20Planner_20App-8.jpg",
        },
        {
            id: "learning",
            name: "Learning Hub",
            url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/5__20Learning_20hub-6.jpg",
        },
    ];

    const stages = [
        "Analyzing prompt...",
        "Designing architecture...",
        "Building components...",
        "Connecting database...",
        "Optimizing performance...",
        "Finalizing UI...",
        "Launching app!"
    ];

    useEffect(() => {
        if (activeTab === "builder") {
            setIsBuilding(true);
            setProgress(0);
            setBuildStage(stages[0]);

            const timer = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        setTimeout(() => setIsBuilding(false), 800);
                        return 100;
                    }
                    const next = prev + Math.random() * 8;

                    // Update stage text based on progress
                    const stageIndex = Math.min(
                        Math.floor((next / 100) * stages.length),
                        stages.length - 1
                    );
                    setBuildStage(stages[stageIndex]);

                    return Math.min(next, 100);
                });
            }, 150);

            return () => clearInterval(timer);
        }
    }, [activeTab]);

    return (
        <section className="">
            {/* Dot Grid Background Overlay */}
            <div
                className="absolute inset-0 z-0 bg-dot-grid pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            <div className="container relative z-10 flex flex-col items-center">
                {/* Toggle Switch */}
                <div className="flex p-1.5 bg-[#f5f5f5] rounded-full shadow-sm mb-12 relative">
                    <button
                        onClick={() => setActiveTab("prompt")}
                        className={cn(
                            "relative px-8 py-2.5 rounded-full text-sm transition-all duration-300 ease-in-out font-medium z-10",
                            activeTab === "prompt"
                                ? "text-[#0099ff]"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Prompt
                    </button>
                    <button
                        onClick={() => setActiveTab("builder")}
                        className={cn(
                            "relative px-8 py-2.5 rounded-full text-sm transition-all duration-300 ease-in-out font-medium z-10",
                            activeTab === "builder"
                                ? "text-[#0099ff]"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Builder
                    </button>

                    {/* Sliding Background for Switch */}
                    <div
                        className={cn(
                            "absolute top-1.5 bg-[#0099ff]/20 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                            activeTab === "prompt" ? "left-1.5" : "left-[calc(50%+3px)]"
                        )}
                    />
                </div>

                {/* Content Container */}
                <div className="w-full max-w-[1100px] h-[600px] relative mt-8 flex items-center justify-center">

                    <AnimatePresence mode="wait">
                        {activeTab === "prompt" ? (
                            <motion.div
                                key="prompt-view"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="relative w-full h-full flex items-center justify-center"
                            >
                                {/* Blurred App Slider Background */}
                                <div className="flex gap-4 items-center justify-center h-full perspective-[2000px] opacity-40 blur-sm pointer-events-none scale-90">
                                    {appTemplates.map((template, index) => (
                                        <div
                                            key={template.id}
                                            className={cn(
                                                "relative transition-all duration-700 ease-in-out origin-center shrink-0",
                                                "rounded-2xl overflow-hidden shadow-soft border border-white/20",
                                                index === 0 && "rotate-[-4deg] -translate-x-12 translate-y-8 h-[380px] w-[260px]",
                                                index === 1 && "rotate-[-2deg] -translate-x-6 h-[440px] w-[300px]",
                                                index === 2 && "rotate-0 scale-105 z-20 h-[480px] w-[340px]",
                                                index === 3 && "rotate-[2deg] translate-x-6 h-[440px] w-[300px]",
                                                index === 4 && "rotate-[4deg] translate-x-12 translate-y-8 h-[380px] w-[260px]",
                                                index === 0 || index === 4 ? "hidden lg:block" : "block"
                                            )}
                                        >
                                            <Image
                                                src={template.url}
                                                alt={template.name}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 300px, 340px"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Prompt Box Overlay */}
                                {activeTab === "prompt" && (
                                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[24px] shadow-2xl border border-white max-w-[480px] w-full animate-in fade-in zoom-in duration-300">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-9 h-8 rounded-full bg-[#0099ff]/20 flex items-center justify-center">
                                                    <span className="text-accent-orange text-sm font-bold"><img src="/icons/falbor.png" alt="" /></span>
                                                </div>
                                                <div className=" w-full" >
                                                    <span className="text-black text-sm font-sans font-light">Build an AI-powered writing assistant - should help improve writing with suggestions for grammar, style, and clarity using AI algorithms.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="builder-view"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="w-full h-full flex flex-col items-center justify-center"
                            >
                                {isBuilding ? (
                                    <div className="flex flex-col items-center">
                                        {/* Construction Animation */}
                                        <div className="relative w-[300px] h-[300px] mb-8 flex items-center justify-center">
                                            {/* Rotating Gears/Icons */}
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 border-2 border-dashed border-[#0099ff69] rounded-full"
                                            />

                                            <div className="grid grid-cols-2 gap-8 relative z-10">
                                                <motion.div
                                                    animate={{
                                                        y: [0, -10, 0],
                                                        scale: [1, 1.1, 1],
                                                        rotate: [0, 10, -10, 0]
                                                    }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-gray-500 border"
                                                >
                                                    <Hammer size={32} />
                                                </motion.div>
                                                <motion.div
                                                    animate={{
                                                        y: [0, 10, 0],
                                                        scale: [1, 0.9, 1],
                                                        rotate: [0, -10, 10, 0]
                                                    }}
                                                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}
                                                    className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-gray-500 border"
                                                >
                                                    <Cpu size={32} />
                                                </motion.div>
                                                <motion.div
                                                    animate={{
                                                        x: [0, -10, 0],
                                                        scale: [1, 1.05, 1]
                                                    }}
                                                    transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
                                                    className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-gray-500 border"
                                                >
                                                    <Code2 size={32} />
                                                </motion.div>
                                                <motion.div
                                                    animate={{
                                                        x: [0, 10, 0],
                                                        scale: [1, 1.1, 1]
                                                    }}
                                                    transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
                                                    className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-gray-500 border"
                                                >
                                                    <Layout size={32} />
                                                </motion.div>
                                            </div>

                                            {/* Floating UI Elements */}
                                            <motion.div
                                                animate={{ y: [0, -40, 0], opacity: [0, 1, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="absolute top-0 right-0 p-2 bg-white rounded-lg shadow-md text-[10px] font-mono text-gray-400"
                                            >
                                                {"<div>Component</div>"}
                                            </motion.div>
                                            <motion.div
                                                animate={{ x: [0, 40, 0], opacity: [0, 1, 0] }}
                                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                                className="absolute bottom-10 left-0 p-2 bg-white rounded-lg shadow-md text-[10px] font-mono text-gray-400"
                                            >
                                                {"color: #0099ff69"}
                                            </motion.div>
                                        </div>

                                        {/* Progress Bar and Text */}
                                        <div className="w-[400px] flex flex-col items-center">
                                            <div className="flex justify-between w-full mb-3 px-1">
                                                <span className="text-sm font-medium text-gray-900 animate-pulse">{buildStage}</span>
                                                <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                                <motion.div
                                                    className="h-full bg-sunset-gradient"
                                                    style={{
                                                        width: `${progress}%`,
                                                        background: 'linear-gradient(90deg, #0099ff69 0%, #0099ff69 100%)'
                                                    }}
                                                    layoutId="progress-bar"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className="relative w-full h-[540px] max-w-[900px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group"
                                    >
                                        {/* Browser Shell UI */}
                                        <div className="absolute top-0 left-0 right-0 h-10 bg-gray-50 border-b border-gray-200 z-20 flex items-center px-4 gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                            <div className="ml-4 h-5 w-1/2 bg-white rounded-md border border-gray-200 flex items-center px-3">
                                                <div className="w-full h-1 bg-gray-100 rounded-full" />
                                            </div>
                                        </div>

                                        <Image
                                            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/9f35d81d-bc39-4994-a22c-4c9eb1fa138d-base44-com/assets/images/1__20Inventory_20Management_20App-5.jpg"
                                            alt="Created Application"
                                            fill
                                            className="object-cover pt-10 group-hover:scale-105 transition-transform duration-1000"
                                        />

                                        {/* Success Badge */}
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 }}
                                            className="absolute bottom-8 right-8 z-30 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                <MonitorCheck size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider leading-none mb-0.5">Status</p>
                                                <p className="font-bold leading-none">Ready to Launch</p>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>

            <style jsx global>{`
        .bg-dot-grid {
          mask-image: radial-gradient(circle at center, black, transparent 80%);
        }
      `}</style>
        </section>
    );
};

export default ApplicationPreview;