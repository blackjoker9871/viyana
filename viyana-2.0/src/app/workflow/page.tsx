'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkflowPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home where the persistent workflow builder lives
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Redirecting to persistent workspace...</p>
      </div>
    </div>
  );
}
