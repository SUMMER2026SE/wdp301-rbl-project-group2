import cloudinary from '@/config/cloudinary';

type TResourceType = 'image' | 'video' | 'raw' | 'auto' | undefined;

type TTransformedUrlParams = {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
  format?: string;
  effect?: string;
  gravity?: string;
  resource_type?: TResourceType;
};

/**
 * Generate cloudinary transformed URL
 */
export const transformUrl = (
  public_id: string,
  {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    effect,
    gravity,
    resource_type = 'image',
  }: TTransformedUrlParams = {}
) => {
  return cloudinary.url(public_id, {
    resource_type,
    width,
    height,
    crop,
    quality,
    fetch_format: format,
    effect,
    gravity,
    secure: true,
  });
};
