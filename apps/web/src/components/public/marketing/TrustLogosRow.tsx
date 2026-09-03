export function TrustLogosRow({ logos, rating }: { logos: string[]; rating?: { score: string; count: string } }) {
  if (logos.length === 0) return null;
  return (
    <div className="border-t border-ink-100 py-10">
      <p className="text-center text-sm font-medium text-ink-500">Trusted by forward-thinking organizations</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {logos.map((logo) => (
          <span key={logo} className="text-lg font-bold text-ink-400 opacity-80 grayscale">
            {logo}
          </span>
        ))}
      </div>
      {rating && (
        <p className="mt-4 text-center text-sm text-ink-500">
          <span className="font-semibold text-ink-800">★ {rating.score}</span> from {rating.count} reviews
        </p>
      )}
    </div>
  );
}
