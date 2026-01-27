import type { ReactNode } from 'react';
import LogoutButton from '@/features/auth/LogoutButton';

export default function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow">
        <h1 className="text-xl font-semibold">{title}</h1>
        <LogoutButton />
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}
