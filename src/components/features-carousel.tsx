"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ChefHat,
  Coins,
  HandCoins,
  Scale,
  Wallet,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { DotMotif } from "@/components/dot-motif";

const display = "font-[family-name:var(--font-display)]";

const FEATURES = [
  {
    title: "One sale, many ways to pay",
    body: "Customer pays half by QRIS and the rest in cash? Log both on the same receipt. Change is worked out for you, and a double-tapped sale never gets recorded twice.",
    icon: Wallet,
    tone: "bg-(--mint)",
  },
  {
    title: "Sell by weight",
    body: "Rice by 2.5 kg, oil by 0.75 L. Decimal quantities work everywhere, at the register and in stock.",
    icon: Scale,
    tone: "bg-(--ink) text-white",
    dark: true,
  },
  {
    title: "Stock you can trace",
    body: "Every restock, sale, return, and adjustment leaves a trail. You get a heads-up before anything runs out.",
    icon: Boxes,
    tone: "bg-(--line)",
  },
  {
    title: "Customer tabs",
    body: "Track what each customer owes, set a tab limit, and take installments whenever they pay.",
    icon: HandCoins,
    tone: "bg-(--sun)",
  },
  {
    title: "Recipes for cafés & restaurants",
    body: "Sell one portion and the ingredients deduct themselves.",
    icon: ChefHat,
    tone: "bg-(--mint)",
  },
  {
    title: "Profit you can trust",
    body: "Cost price is saved at the moment of sale, so daily and monthly profit don't shift when your buying prices do. Operating expenses and returns are counted too.",
    icon: Coins,
    tone: "bg-(--ink) text-white",
    dark: true,
  },
];

export function FeaturesCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setIndex(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  return (
    <Carousel setApi={setApi} opts={{ align: "start" }} className="mt-12">
      {/* py-4 memberi ruang untuk hover lift & shadow, karena viewport carousel overflow-hidden */}
      <CarouselContent className="-ml-4 py-4">
        {FEATURES.map(({ title, body, icon: Icon, tone, dark }) => (
          <CarouselItem
            key={title}
            className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/3"
          >
            <article
              className={`relative h-full min-h-[280px] overflow-hidden rounded-xl border border-(--line) p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg md:p-8 ${tone}`}
            >
              <DotMotif dark={dark} />
              <div
                className={`relative grid size-9 place-items-center rounded-lg ${
                  dark ? "bg-white/15" : "bg-(--ink)/10"
                }`}
              >
                <Icon className="size-5" />
              </div>
              <h3 className={`${display} relative mt-5 text-2xl font-semibold`}>
                {title}
              </h3>
              <p
                className={`relative mt-2 leading-relaxed ${
                  dark ? "text-white/75" : "text-(--ink)/75"
                }`}
              >
                {body}
              </p>
            </article>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-(--teal)" : "w-2 bg-(--ink)/20"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => api?.scrollPrev()}
            className="grid size-10 place-items-center rounded-sm border border-(--ink)/20 transition hover:bg-(--ink) hover:text-white disabled:pointer-events-none disabled:opacity-30"
            disabled={index === 0}
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => api?.scrollNext()}
            className="grid size-10 place-items-center rounded-sm bg-(--teal) text-white transition hover:bg-(--ink) disabled:pointer-events-none disabled:opacity-30"
            disabled={count > 0 && index === count - 1}
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </Carousel>
  );
}
