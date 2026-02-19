"use client"

import React, { useEffect, useState } from "react"

function HeroText() {
  const words = [
    "websites",
    "apps",
    "platforms",
    "dashboards",
    "products",
    "interfaces",
    "landing pages",
    "portals",
    "SaaS tools",
    "digital systems",
    "online businesses",
    "web applications",
    "internal tools",
    "startup products",
    "client portals",
    "admin panels",
    "marketing sites",
    "company platforms",
    "AI products",
    "automation tools",
    "data platforms",
    "commerce sites",
    "brand experiences",
    "interactive pages",
    "software products",
    "content platforms",
    "digital services",
    "user experiences",
    "full-stack projects",
    "custom solutions",
    "modern interfaces",
    "scalable systems",
    "web infrastructure",
    "online products",
    "business tools",
    "production systems",
    "creative platforms",
    "internet products",
    "web solutions",
    "digital platforms",
  ]

  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length)
        setVisible(true)
      }, 250)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative p-2 rounded-4xl">
      <h2 className="font-medium text-black tracking-tight text-4xl montserrat text-center whitespace-nowrap leading-tight">
        Turn your ideas into{" "}
        <span className="relative inline-block align-baseline min-w-[280px]">
          <span className="invisible block">digital infrastructure</span>
          <span
            className={`absolute left-0 top-0 transition-all duration-300 ease-out ${visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1"
              }`}
          >
            {words[index]}
          </span>
        </span>

        <svg
          viewBox="0 0 100 100"
          className="inline-block w-[0.32em] h-[0.32em] animate-diamond-rotate ml-2 align-baseline"
        >
          <path d="M50 8 L92 50 L50 92 L8 50 Z" fill="url(#diamondGradient)" />
          <path d="M50 8 L8 50 L50 50 Z" fill="url(#diamondShine)" />
          <path
            d="M50 18 L82 50 L50 82 L18 50 Z"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
          />
        </svg>
      </h2>
    </div>
  )
}

export default HeroText
