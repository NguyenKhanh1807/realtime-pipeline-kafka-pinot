import { ScorePage } from '@/src/components/pages';
import { ProtectedRoute } from '@/src/components/routes';

export default function Score() {
  return (
    <ProtectedRoute>
      <ScorePage />
    </ProtectedRoute>
  );
}

