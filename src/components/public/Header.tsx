import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import SearchBar from "./SearchBar";

interface HeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit?: () => void;
}

export default function Header({ query, onQueryChange, onSearchSubmit }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-divider bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-340 items-center gap-5 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-heading text-lg text-background">
            Д
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-heading text-[21px] tracking-tight">Мэдээллийн сан</span>
            <span className="text-[11px] font-semibold tracking-[0.09em] text-neutral-600 uppercase">
              Дотоод лавлах · DDISH
            </span>
          </span>
        </Link>

        <div className="mx-auto max-w-xl flex-1">
          <SearchBar value={query} onChange={onQueryChange} onSubmit={onSearchSubmit} />
        </div>

        <Link
          href="/admin"
          className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-neutral-200"
        >
          <ShieldCheck size={16} />
          <span className="hidden sm:inline">Админ нэвтрэх</span>
        </Link>
      </div>
    </header>
  );
}
