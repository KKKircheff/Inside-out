import { notFound } from 'next/navigation';
import { getDebate, getDebateMessages } from '@/app/actions/debates';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/client';
import DebateDetail from '@/components/DebateDetail';
import ProtectedRoute from '@/components/ProtectedRoute';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DebateDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Note: In a real app, you'd get the user ID from the session/auth
  // For now, we'll handle this client-side in the DebateDetail component
  // This is a server component that will hydrate the client component

  return (
    <ProtectedRoute>
      <DebateDetail debateId={id} />
    </ProtectedRoute>
  );
}
