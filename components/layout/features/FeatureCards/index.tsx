"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const cards = [
  {
    title: "Customize your AI agent",
    text: "Choose from many models.",
    img: "/layout/img_ModelselctorNEW.png",
    imgClass: "mt-50 h-[252px]",
  },
  {
    title: "Create skills",
    text: "Automate your workflow with custom skills.",
    img: "/layout/SkilsNew.webp",
    imgClass: "h-[72px]",
    badge: "Coming soon"
  },
  {
    title: "Deploy website fast",
    text: "Launch websites in one click.",
    type: "button",
    buttonText: "Deploy",
    buttonClass: "h-[36px]"
  }
]

export default function FeatureCards() {
  const [index, setIndex] = useState(0)

  const next = () => {
    setIndex((prev) => (prev + 1) % cards.length)
  }

  const goTo = (i: number) => {
    setIndex(i)
  }

  return (
    <div>
      <div className="w-full flex justify-center">
        <div className="relative w-[420px] h-[70px] overflow-hidden rounded-sm">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {cards.map((card, i) => (
              <div
                key={i}
                onClick={next}
                className="cursor-pointer w-[420px] h-[70px] flex-shrink-0 bg-[#dbd9d9b2] dark:bg-[#2C2C30] text-black dark:text-white rounded-sm px-3 flex items-center justify-between relative"
              >
                {/* TEXT */}
                <div className="mt-[-7px] px-2">
                  <h3 className="text-md">
                    {card.title}
                  </h3>

                  <p className="text-[10px]">
                    {card.text}
                  </p>
                </div>
                {/* RIGHT SIDE */}
                {card.type === "button" ? (
                  <div className={`bg-[#adababb2] w-[40%] p-[5px] rounded-[12px]`}>
                    <button
                      className={cn(
                        "flex items-center w-[100%] text-center gap-1 text-sm px-3 py-1.5 rounded-[8px] transition-colors cursor-default bg-white border border-black/30 text-black/80",
                        card.buttonClass
                      )}
                    >
                      <span className="text-center w-full">{card.buttonText}</span>
                    </button>
                  </div>
                ) : (
                  <img
                    src={card.img}
                    className={`rounded-md opacity-90 ${card.imgClass}`}
                    alt=""
                  />
                )}
                {/* BADGE */}
                {card.badge && (
                  <span className="absolute top-1 right-1 text-[8px] px-1.5 py-[2px] bg-yellow-400 text-black rounded">
                    {card.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* DOTS */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-1.5 h-1.5 rounded-full ${index === i
              ? "bg-white"
              : "bg-gray-400/40"
              }`}
          />
        ))}
      </div>
    </div>
  )
}