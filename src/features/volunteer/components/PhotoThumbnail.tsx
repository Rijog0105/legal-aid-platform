import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getSignedPhotoUrl } from '@/features/volunteer/services/photoService';

interface PhotoThumbnailProps {
  path: string;
  alt?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Renders a photo stored in the private `camp-photos` bucket by resolving
 * a short-lived signed URL for its storage path on mount.
 */
export function PhotoThumbnail({
  path,
  alt = 'Captured photo',
  onClick,
  className = '',
}: PhotoThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);

    getSignedPhotoUrl(path).then((signedUrl) => {
      if (cancelled) return;
      if (signedUrl) {
        setUrl(signedUrl);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) {
    return (
      <div className={`w-full aspect-square rounded-xl bg-surface-100 flex items-center justify-center text-surface-300 ${className}`}>
        <ImageOff size={18} />
      </div>
    );
  }

  if (!url) {
    return <div className={`w-full aspect-square rounded-xl bg-surface-100 animate-pulse ${className}`} />;
  }

  return (
    <img
      src={url}
      alt={alt}
      onClick={onClick}
      className={`w-full aspect-square rounded-xl object-cover border border-surface-200 transition-all ${
        onClick ? 'cursor-pointer hover:opacity-90 hover:scale-[1.02]' : ''
      } ${className}`}
      loading="lazy"
    />
  );
}
