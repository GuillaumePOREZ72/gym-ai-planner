import { AuthView } from '@neondatabase/neon-js/auth/react/ui';
import { useParams } from 'react-router-dom';

export default function Auth() {
  const { pathname } = useParams();
  return (
    <div className="flex items-center justify-center min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-md w-full">
        <AuthView pathname={pathname} />
      </div>
    </div>
  )
}