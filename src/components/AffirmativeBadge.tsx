export function AffirmativeBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/60 px-3 py-1.5 mb-4">
      <span className="flex gap-0.5 items-center" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="w-2 h-2 rounded-full bg-orange-400" />
        <span className="w-2 h-2 rounded-full bg-yellow-400" />
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="w-2 h-2 rounded-full bg-violet-500" />
      </span>
      <span className="text-xs font-medium text-slate-200 tracking-wide">
        Psicólogo LGBT+
      </span>
    </div>
  );
}
