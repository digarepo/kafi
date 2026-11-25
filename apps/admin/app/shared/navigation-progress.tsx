import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router';
import { Loader } from 'lucide-react';

export function NavigationProgress() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (navigation.state !== 'loading') {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, [navigation.state]);

  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
