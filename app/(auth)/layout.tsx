export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center p-6">
      <div className="w-full">{children}</div>
    </div>
  );
}


