"use client"

import { useEffect, useRef, useState } from "react"

export default function Example() {
    const ref = useRef<HTMLDivElement | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                }
            },
            {
                threshold: 0.25,
            }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');

        * {
          font-family: 'Poppins', sans-serif;
        }

        .feature-image {
          transition: transform 0.9s cubic-bezier(.22,1,.36,1), opacity 0.9s ease;
          transform: translateY(120px);
          opacity: 0;
        }

        .feature-image.show {
          transform: translateY(0px);
          opacity: 1;
        }
      `}</style>

            <div ref={ref} className="px-4 md:px-8">
                <p className="bg-gradient-to-r from-slate-800 to-[#4D6EA3] text-transparent bg-clip-text text-2xl md:text-3xl text-left font-medium max-w-2xl">
                    Why do 500+ companies choose to integrate our features?
                </p>

                <div className="relative p-10">
                    <img
                        src="/Build & Manage (1).png"
                        alt="features showcase"
                        className={`feature-image rounded-xl w-full md:w-full h-auto mb-10 ${visible ? "show" : ""
                            }`}
                    />

                    <img
                        src="/Build & Manage.png"
                        alt="features showcase"
                        className={`feature-image rounded-xl w-full md:w-full h-auto ${visible ? "show" : ""
                            }`}
                    />
                </div>
            </div>
        </>
    )
}