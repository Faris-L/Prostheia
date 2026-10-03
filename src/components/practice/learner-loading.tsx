export function LearnerLoading() {
  return <div aria-hidden="true" className="space-y-5 animate-pulse">
    <div className="h-2 w-28 rounded bg-surface-soft" /><div className="h-10 w-2/3 rounded bg-surface-soft" /><div className="h-4 w-1/2 rounded bg-surface-soft" />
    <div className="grid gap-4 md:grid-cols-2"><div className="app-surface h-40" /><div className="app-surface h-40" /></div>
    <div className="app-surface h-56" />
  </div>;
}
