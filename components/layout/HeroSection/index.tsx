import React from "react";
import "@/styles/endpoint.scss"

interface Card {
  title: string;
  description: string;
  image?: React.ReactNode;
}

const cards: Card[] = [
  {
    title: "Excellence, streamlined in one interface",
    description:
      "Falbor embeds cutting-edge AI programming agents from leading AI labs within a unified, easy-to-use environment. Say goodbye to the hassle of switching between applications.",
    image: <div className="bg-none w-full h-64 rounded-md flex items-center justify-center text-gray-400"><img width={250} src="/layout/img_ModelselctorNEW.png" alt="" /></div>,
  },
  {
    title: "Import entire websites from Github",
    description:
      "Falbor lets you bring in full GitHub projects, modify, enhance, and deploy them in seconds—elevating any project to the next level.",
    image: <div className="bg-none w-full h-64 rounded-md flex items-center justify-center text-gray-400"><img width={400} src="/layout/githUBimgLinkURLNEW.png" alt="" /></div>,
  },
  {
    title: "From Idea to Live Project—Intelligently",
    description: "Falbor creates your project end-to-end, intelligently structuring files, coding dynamically, and continuously suggesting improvements—giving insights and optimizations.",
    image: <div className="bg-none w-full h-64 rounded-md relative top-[-10px] flex items-center justify-center text-gray-400"><img width={600} src="/layout/MesegesImg12NEW.png" alt="" /></div>,
  },
];

export default function EuroSection() {
  return (
    <div className="bg-white text-white flex flex-col items-center justify-center px-4 py-12 rounded-xl">
      {/* Top glowing icon */}
      <div className="mb-6">
        <button className="button" type="button">
          <span className="print print--under">
          </span>
        </button>
      </div>
      {/* Main heading */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-black">
        Enabling developers to build <br />
        <span className="text-black/90 font-sans font-light">with next-level AI coding assistants</span>
      </h1>

      {/* Subheading */}
      <p className="text-center text-black/80 max-w-[30%] mb-12">
        Falbor handles the complex work, letting you focus on bringing your ideas to life rather than debugging.
      </p>

      {/* Cards layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl">
        {/* Top card with two-column layout */}
        <div className="md:col-span-2 bg-white rounded-xl p-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          {/* Left side: text */}
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 text-black/90">{cards[0].title}</h3>
            <p className="text-black/80 text-sm">{cards[0].description}</p>
          </div>

          {/* Right side: image */}
          <div className="flex-1">
            {cards[0].image}
          </div>
        </div>

        {/* Bottom two cards */}
        {cards.slice(1).map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl flex flex-col space-y-4">
            <div className="p-6 bg-white z-50 rounded-xl">
              <h3 className="font-semibold text-lg text-black/90">{card.title}</h3>
              <p className="text-black/80 text-sm">{card.description}</p>
            </div>
            {card.image}
          </div>
        ))}
      </div>
    </div>
  );
}
