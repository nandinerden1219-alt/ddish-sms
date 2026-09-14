import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { Toaster } from "sonner";
import { THEME_INIT_SCRIPT } from "@/lib/themeScript";
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
    // data-theme is set by the inline script before paint; suppress the
    // server/client attribute mismatch warning that this intentionally causes.
    <html
      lang="mn"
      className={`${unbounded.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
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
