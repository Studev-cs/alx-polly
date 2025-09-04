'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function PollsLayout({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div>Loading...</div>; // Or a proper loading spinner/redirecting message
  }

  return <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">{children}</div>;
}


