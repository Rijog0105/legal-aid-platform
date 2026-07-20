import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getSignedPhotoUrl } from '@/features/volunteer/services/photoService';

interface PhotoThumbnailProps {
  path: string;
  alt?: string;
}

/**
 * Renders a photo stored in the private `camp-photos` bucket by resolving
 * a short-lived signed URL for its storage path on mount. Used by the
 * capture-flow mini-gallery and the My Submissions gallery.
 */
export function PhotoThumbnail({ path, alt = 'Captured photo' }: PhotoThumbnailProps) {
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
      <div className="w-full aspect-square rounded-xl bg-surface-100 flex items-center justify-center text-surface-300">
        <ImageOff size={18} />
      </div>
    );
  }

  if (!url) {
    return <div className="w-full aspect-square rounded-xl bg-surface-100 animate-pulse" />;
  }

  return (
    <img
      src={url}
      alt={alt}
      className="w-full aspect-square rounded-xl object-cover border border-surface-200"
      loading="lazy"
    />
  );
}
