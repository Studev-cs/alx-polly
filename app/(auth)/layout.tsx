export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center p-6">
      <div className="w-full rounded-lg border border-gray-300 bg-card text-card-foreground shadow-md dark:border-green-500 dark:shadow-green-500/50 p-6">{children}</div>
    </div>
  );
}


