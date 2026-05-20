// Phase 1 (May 2026):
//   Added dark-mode Tailwind variants. Structure/spacing/typography unchanged.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-8 shadow-lg dark:shadow-black/30 ring-1 ring-slate-200/60 dark:ring-slate-800">
        {children}
      </div>
    </div>
  );
}
