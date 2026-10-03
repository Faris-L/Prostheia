export function ProstheiaMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="12" fill="var(--accent-soft)" />
      <path d="M12.2 12.6c1.8-2.4 4.6-3.4 7.8-1.7 3.2-1.7 6-0.7 7.8 1.7 2.5 3.4.6 7.6-.7 10.7-1.2 2.8-1.7 6.8-3.6 6.8-1.4 0-1.4-5-3.5-5s-2.1 5-3.5 5c-1.9 0-2.4-4-3.6-6.8-1.3-3.1-3.2-7.3-.7-10.7Z" stroke="var(--accent-strong)" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M15.1 14.1c1.1-1 2.4-1.1 3.7-.5m6.1.5c-1.1-1-2.4-1.1-3.7-.5" stroke="var(--accent-strong)" strokeWidth="1.2" strokeLinecap="round" opacity=".65" />
    </svg>
  );
}

export function DentalPreview({ label = "Technical line illustration of an upper dental arch" }: { label?: string }) {
  return (
    <svg viewBox="0 0 520 360" className="h-full w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id="archFill" x1="0" x2="1" y1="0" y2="1"><stop stopColor="var(--accent)" stopOpacity=".18"/><stop offset="1" stopColor="var(--accent-blue)" stopOpacity=".08"/></linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="var(--accent-strong)" floodOpacity=".10"/></filter>
      </defs>
      <g filter="url(#softShadow)" transform="translate(0 5)">
        <path d="M91 135c26-48 79-76 169-76s143 28 169 76c-13 83-66 153-169 153S104 218 91 135Z" fill="url(#archFill)" stroke="var(--accent-strong)" strokeOpacity=".55" strokeWidth="2"/>
        <path d="M111 132c32-32 77-50 149-50s117 18 149 50c-14 60-58 107-149 107s-135-47-149-107Z" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeDasharray="4 7"/>
        <path d="M127 144c18-20 37-28 51-17l5 30c-8 15-26 22-42 15-10-4-16-15-14-28Zm57-26c14-13 32-13 42-2l2 31c-8 13-25 18-39 12-11-5-15-25-5-41Zm47-9c12-10 29-9 38 1v31c-8 12-24 16-36 9-9-5-10-30-2-41Zm45 0c9-10 26-11 38-1 8 11 7 36-2 41-12 7-28 3-36-9v-31Zm44 9c10-11 28-11 42 2 10 16 6 36-5 41-14 6-31 1-39-12l2-31Zm55 26c2 13-4 24-14 28-16 7-34 0-42-15l5-30c14-11 33-3 51 17Z" fill="var(--surface)" stroke="var(--accent-strong)" strokeOpacity=".52" strokeWidth="1.4"/>
        <path d="M260 96v178" stroke="var(--accent-strong)" strokeOpacity=".24" strokeDasharray="3 6"/>
        <circle cx="182" cy="149" r="4" fill="var(--accent-strong)"/><circle cx="338" cy="149" r="4" fill="var(--accent-strong)"/>
      </g>
      <g fill="var(--muted)" fontFamily="var(--font-sans)" fontSize="10" letterSpacing="1.5"><text x="28" y="33">UPPER ARCH · STUDY VIEW</text><text x="380" y="328">ANATOMY PREVIEW</text></g>
      <path d="M28 44h98M394 316h98" stroke="var(--border)"/>
    </svg>
  );
}
