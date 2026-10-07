import { useState } from 'react'
import { IconPhoto } from '@tabler/icons-react'
import { useImageUrl } from '../lib/images'

/**
 * Product mockup image with a neutral placeholder.
 *
 * `className` sizes the square box; the image fills it (`object-cover`).
 * A missing key, unresolved base URL, or load error all render the same
 * icon placeholder, so the grid never shows a broken image.
 */
export function ProductImage({
  imageKey,
  alt,
  className = 'size-10',
  iconSize = 20,
}: {
  imageKey: string | null | undefined
  /** Product name; empty string when the image is decorative. */
  alt: string
  className?: string
  iconSize?: number
}) {
  const url = useImageUrl(imageKey)
  const [failed, setFailed] = useState(false)

  if (!url || failed) {
    return (
      <span
        className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-divider bg-surface-muted text-mute ${className}`}
        aria-hidden={alt === ''}
        role={alt === '' ? undefined : 'img'}
        aria-label={alt === '' ? undefined : `${alt} (tanpa gambar)`}
      >
        <IconPhoto size={iconSize} stroke={1.8} />
      </span>
    )
  }

  return (
    <span className={`block shrink-0 overflow-hidden rounded-lg border border-divider bg-surface-muted ${className}`}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="size-full object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  )
}
