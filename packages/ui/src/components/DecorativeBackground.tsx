import { useEffect, useState } from 'react';

interface DecorativeBackgroundProps {
  variant?: 'default' | 'subtle' | 'ambient';
}

export function DecorativeBackground({
  variant = 'default',
}: DecorativeBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      {variant !== 'subtle' && (
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Primary floating orb - emerald glow */}
      <div
        className="absolute -top-[20%] -right-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full animate-pulse-glow"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 84, 48, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Secondary orb */}
      <div
        className="absolute top-[30%] left-[-15%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full animate-float"
        style={{
          background:
            'radial-gradient(circle, rgba(197, 160, 89, 0.06) 0%, transparent 70%)',
        }}
      />

      {/* Tertiary subtle glow */}
      <div
        className="absolute bottom-[10%] right-[20%] w-[30vw] h-[30vw] max-w-75 max-h-75 rounded-full animate-float-delayed"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 84, 48, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* Ambient gradient overlay for dark mode */}
      <div className="absolute inset-0 dark:bg-linear-to-br dark:from-brand-primary/5 dark:via-transparent dark:to-transparent opacity-0 dark:opacity-100 transition-opacity duration-500" />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.02) 100%)',
        }}
      />
    </div>
  );
}
