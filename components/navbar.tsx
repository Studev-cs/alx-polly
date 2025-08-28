"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/polls" className="text-sm font-semibold">
            ALX POLLY
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/polls" className="hover:text-foreground">Polls</Link>
            <Link href="/polls/new" className="hover:text-foreground">Create</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/signin" className="text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="text-muted-foreground hover:text-foreground">Sign up</Link>
          </nav>
          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
            <span className="sr-only">Toggle theme</span>
            ☀️/🌙
          </Button>
        </div>
      </div>
    </header>
  );
}


