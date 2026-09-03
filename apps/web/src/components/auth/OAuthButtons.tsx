export function OAuthButtons({ providers = ['google', 'microsoft', 'apple'] as const, verb = 'Sign in' }: { providers?: readonly ('google' | 'microsoft' | 'apple')[]; verb?: string }) {
  const gridCols = providers.length === 3 ? 'grid-cols-3' : providers.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  function startOAuth(provider: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    window.location.href = `${apiUrl}/auth/oauth/${provider}/start`;
  }

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {providers.includes('google') && (
        <OAuthButton onClick={() => startOAuth('google')} label={providers.length === 1 ? `${verb} with Google` : 'Google'} icon={<GoogleIcon />} />
      )}
      {providers.includes('microsoft') && (
        <OAuthButton onClick={() => startOAuth('microsoft')} label={providers.length === 1 ? `${verb} with Microsoft` : 'Microsoft'} icon={<MicrosoftIcon />} />
      )}
      {providers.includes('apple') && (
        <OAuthButton onClick={() => startOAuth('apple')} label={providers.length === 1 ? `${verb} with Apple` : 'Apple'} icon={<AppleIcon />} />
      )}
    </div>
  );
}

function OAuthButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.66z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.1-6.7-4.93H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.33a7.2 7.2 0 0 1 0-4.66V6.57H1.3a12 12 0 0 0 0 10.86z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.3 6.57l4 3.1C6.24 6.85 8.88 4.75 12 4.75z" />
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F35325" />
      <rect x="13" y="1" width="10" height="10" fill="#81BC06" />
      <rect x="1" y="13" width="10" height="10" fill="#05A6F0" />
      <rect x="13" y="13" width="10" height="10" fill="#FFBA08" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.437 2.163-1.31 3.062-.94.973-2.106 1.564-3.34 1.463-.114-1.126.454-2.29 1.334-3.113C13.92.845 15.153.27 16.19 0c.144.475.176.958.175 1.43zm4.457 16.6c-.42.972-.921 1.94-1.68 2.82-.83.98-1.71 1.955-2.99 1.98-1.226.024-1.63-.75-3.03-.75-1.4 0-1.85.727-3.02.774-1.26.048-2.22-1.06-3.06-2.03-1.63-1.905-2.9-5.39-1.21-7.83.84-1.21 2.32-1.97 3.79-1.99 1.24-.024 2.4.83 3.02.83.62 0 2.03-1.023 3.42-.873.58.024 2.21.235 3.26 1.77-.084.052-1.945 1.135-1.925 3.386.024 2.688 2.36 3.583 2.39 3.6-.02.06-.37 1.26-1.22 2.5z" />
    </svg>
  );
}
