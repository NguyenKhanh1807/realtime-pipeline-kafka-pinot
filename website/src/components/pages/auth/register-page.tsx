'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/src/components/organisms';
import { ThemeToggle } from '@/src/components/molecules';
import { AuthTemplate } from '@/src/components/templates';

export default function RegisterPage() {
  const router = useRouter();

  const handleRegisterSuccess = () => {
    router.push('/dashboard');
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <AuthTemplate
      title="Create Account"
      subtitle="Join our fraud detection team"
      header={<ThemeToggle />}
    >
      <RegisterForm
        onSuccess={handleRegisterSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </AuthTemplate>
  );
}
