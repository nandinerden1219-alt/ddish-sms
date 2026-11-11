"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import StorageImage from "@/components/StorageImage";
import type { InformationImage } from "@/types";

interface ImageLightboxProps {
  images: InformationImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export default function ImageLightbox({ images, index, onIndexChange, onClose }: ImageLightboxProps) {
  const count = images.length;
  const image = images[index];
  const prev = () => onIndexChange((index - 1 + count) % count);
  const next = () => onIndexChange((index + 1) % count);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
      else if (e.key === "ArrowRight") onIndexChange((index + 1) % count);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, count, onIndexChange, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Portal: the card's fade-in animation uses a transform, which would trap a
  // position:fixed overlay inside the card.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Зураг ${index + 1} / ${count}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex animate-fade-in flex-col items-center justify-center gap-3 bg-black/85 px-4 pt-16 pb-14 sm:px-16"
    >
      <StorageImage
        path={image.path}
        alt={image.name || `${index + 1}-р алхам`}
        onClick={(e) => e.stopPropagation()}
        className="min-h-0 max-w-full flex-initial rounded-sm object-contain shadow-lg"
      />
      {image.name && (
        <p
          onClick={(e) => e.stopPropagation()}
          className="max-w-2xl shrink-0 text-center text-[15px] font-medium text-white"
        >
          {image.name}
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Хаах"
        className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
      >
        <X size={20} />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Өмнөх зураг"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 sm:left-4"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Дараагийн зураг"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 sm:right-4"
          >
            <ChevronRight size={24} />
          </button>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>,
    document.body
  );
}
