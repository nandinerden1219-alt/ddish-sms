import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: "variable",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Мэдээллийн сан",
  description: "Компанийн дотоод мэдээллийн сан",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={`${unbounded.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-neutral-900)",
              color: "var(--color-neutral-100)",
              border: "none",
              borderRadius: "999px",
            },
          }}
        />
      </body>
    </html>
  );
}
