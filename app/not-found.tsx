"use client"

import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <style>{`
        #falbor-sidebar, #falbor-header { display: none !important; }
        #main-content-square { left: 0 !important; top: 0 !important; }
      `}</style>

      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="z-10 flex flex-col items-center text-center px-4 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">

        {/* 404 Header */}
        <div className="relative group">
          <h1 className="text-[150px] sm:text-[200px] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 select-none">
            404
          </h1>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 -z-10" />
        </div>

        {/* Text Content */}
        <div className="space-y-4 max-w-lg">
          <p className="text-gray-400 text-lg leading-relaxed">
            The page you're looking for has drifted into the unknown. It might have been moved, deleted, or perhaps it never existed at all.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 
            border rounded-full bg-white text-black font-bold cursor-pointer"
          >
            <img src="/icons/Home-icons/home.png" alt="Home" className="h-4 w-4 mr-1 mb-1" />
            Back to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

      </div>

      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-30" />
    </div>
  )
}
