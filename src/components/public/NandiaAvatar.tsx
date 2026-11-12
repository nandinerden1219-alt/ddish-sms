import Image from "next/image";
import { cn } from "@/lib/utils";

/** Nandia AI mascot — the potato picture chosen by the site owner. */
export default function NandiaAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/nandia-avatar.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      // Slightly inset so the arms aren't clipped by the round frames it sits in.
      className={cn("scale-90 select-none", className)}
      draggable={false}
    />
  );
}
