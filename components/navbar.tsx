"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";


export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="border-b">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/polls" className="text-sm font-semibold">
            ALX POLLY
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/polls" className="hover:text-foreground">
              Polls
            </Link>
            <Link href="/new" className="hover:text-foreground">
              Create
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-4 text-sm">
            {!user ? (
              <>
                {pathname === "/signin" && (
                  <Link
                    href="/signup"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Sign up
                  </Link>
                )}
                {pathname === "/signup" && (
                  <Link
                    href="/signin"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Sign in
                  </Link>
                )}
                {pathname !== "/signin" && pathname !== "/signup" && (
                  <>
                    <Link
                      href="/signin"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </>
            ) : (
              <Button variant="ghost" onClick={signOut}>
                Sign out
              </Button>
            )}
          </nav>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun
                className={`h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0c ${theme === "dark" ? "stroke-white fill-white" : ""}`}
              />
            ) : (
              <Moon
                className={`absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100`}
              />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
