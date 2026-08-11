import React, { useState, useEffect } from 'react';
import { getSignedSurveyProofPhotoUrl } from '@/features/volunteer/services/photoService';

interface ImageWithSignedUrlProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const ImageWithSignedUrl: React.FC<ImageWithSignedUrlProps> = ({ src, ...props }) => {
  const [imgUrl, setImgUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    const loadUrl = async () => {
      if (!src) return;
      if (src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://')) {
        if (active) setImgUrl(src);
        return;
      }
      try {
        const signed = await getSignedSurveyProofPhotoUrl(src);
        if (active && signed) {
          setImgUrl(signed);
        }
      } catch (err) {
        console.error('Failed to get signed proof photo URL:', err);
      }
    };
    loadUrl();
    return () => {
      active = false;
    };
  }, [src]);

  return <img src={imgUrl || src} {...props} />;
};
