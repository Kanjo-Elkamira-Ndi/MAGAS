"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Flame, MapPin, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

type Slide = {
  tag: string;
  title: string;
  sub: string;
  icon: React.ElementType;
};

// Dark "cinema" panels that hold their premium look in both themes.
const SLIDES: Slide[] = [
  {
    tag: "Order in seconds",
    title: "Gas at your door in under an hour",
    sub: "Pick your neighbourhood, compare local retailers, and checkout in one tap.",
    icon: Flame,
  },
  {
    tag: "Delivered by agents",
    title: "Trained agents, careful handling",
    sub: "Every cylinder is handled and delivered by verified delivery agents.",
    icon: Truck,
  },
  {
    tag: "Built for Cameroon",
    title: "From Douala to Yaoundé",
    sub: "Local retailers in your area, priced in FCFA, delivered where you are.",
    icon: MapPin,
  },
  {
    tag: "Safety first",
    title: "Certified cylinders, every time",
    sub: "Routine inspections and status tracking on every single order.",
    icon: ShieldCheck,
  },
];

const AUTO_ADVANCE_MS = 5000;

export function HeroCarousel({ className }: { className?: string }) {
  const [current, setCurrent] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = React.useCallback((index: number) => {
    setCurrent((prev) => {
      const next = (index + SLIDES.length) % SLIDES.length;
      return next === prev ? prev : next;
    });
  }, []);

  const next = React.useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prev = React.useCallback(() => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  React.useEffect(() => {
    if (
      paused ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }
    timerRef.current = setInterval(next, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, next]);

  const pause = React.useCallback(() => setPaused(true), []);
  const resume = React.useCallback(() => setPaused(false), []);

  return (
    <div
      className={cn("w-full", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="What MAGAS offers"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 shadow-2xl shadow-black/40 sm:aspect-[5/6] lg:aspect-[4/5]">
        {SLIDES.map((slide, i) => {
          const Icon = slide.icon;
          const active = i === current;
          return (
            <div
              key={slide.title}
              aria-hidden={!active}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                active ? "z-10 opacity-100" : "z-0 opacity-0",
              )}
            >
              {/* ambient glow + watermark */}
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/30 blur-[110px]" />
              <Icon
                aria-hidden="true"
                className="absolute -bottom-10 -right-8 h-64 w-64 rotate-12 text-white/[0.06]"
                strokeWidth={1}
              />

              <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-10">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-stone-200 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {slide.tag}
                </span>
                <h3 className="mt-4 max-w-[16ch] text-2xl leading-tight font-semibold tracking-tight text-stone-50 sm:text-3xl">
                  {slide.title}
                </h3>
                <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-stone-400">
                  {slide.sub}
                </p>
              </div>
            </div>
          );
        })}

        {/* arrows */}
        <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-stone-100 backdrop-blur transition-colors hover:bg-black/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-stone-100 backdrop-blur transition-colors hover:bg-black/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>

        {/* dots */}
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === current
                  ? "w-7 bg-primary"
                  : "w-1.5 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
