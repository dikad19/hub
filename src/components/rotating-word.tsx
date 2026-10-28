"use client";

import { useEffect, useState } from "react";

const WORDS = ["shop", "café", "warung", "salon"];

export function RotatingWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="inline-grid align-bottom text-(--teal)">
      {WORDS.map((w, k) => (
        <span
          key={w}
          aria-hidden={k !== i}
          className={`col-start-1 row-start-1 transition-all duration-500 ${
            k === i ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {w}
        </span>
      ))}
    </span>
  );
}
