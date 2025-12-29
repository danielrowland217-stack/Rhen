"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Card = {
  id: number;
  name: string;
  designation: string;
  content: React.ReactNode;
};

export const CardStack = ({
  items,
  offset,
  scaleFactor,
}: {
  items: Card[];
  offset?: number;
  scaleFactor?: number;
}) => {
  const CARD_OFFSET = offset || 10;
  const SCALE_FACTOR = scaleFactor || 0.06;
  const [cards, setCards] = useState<Card[]>(items);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards((prevCards) => {
        const newArray = [...prevCards];
        const firstCard = newArray.shift();
        if (firstCard) {
          newArray.push(firstCard);
        }
        return newArray;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [items]);

  return (
    <div className="relative h-60 w-60 md:h-60 md:w-96">
      {cards.map((card, index) => {
        return (
          <motion.div
            key={card.id}
            className="absolute bg-black h-60 w-60 md:h-60 md:w-96 rounded-3xl shadow-xl border border-white/[0.1] flex flex-col justify-end"
            style={{
              transformOrigin: "top center",
            }}
            animate={{
              top: index * -CARD_OFFSET,
              scale: 1 - index * SCALE_FACTOR,
              zIndex: cards.length - index,
            }}
          >
            <div className="absolute inset-0">{card.content}</div>
            <div className="relative z-10 p-4">
              <p className="font-medium text-white">{card.name}</p>
              <p className="text-neutral-200 text-xs font-normal inline-block bg-zinc-800 px-2 py-1 rounded-md mt-1">{card.designation}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};