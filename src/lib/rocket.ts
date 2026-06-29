import type { MediaItem, Rocket } from '../content/schema';

/** Build a rocket tile's media list: explicit gallery, else model, else hero image. */
export function rocketMedia(rocket: Rocket): MediaItem[] {
  if (rocket.media.length) return rocket.media;
  if (rocket.model3d) return [{ type: 'model', src: rocket.model3d }];
  if (rocket.heroImage) return [{ type: 'image', src: rocket.heroImage, alt: rocket.name }];
  return [];
}

/** Non-empty spec rows ready for display. */
export function rocketSpecRows(rocket: Rocket): { label: string; value: string }[] {
  const s = rocket.specs;
  return [
    { label: 'Target Altitude', value: s.targetAltitude },
    { label: 'Motor', value: s.motor },
    { label: 'Diameter', value: s.diameter },
    { label: 'Length', value: s.length },
    { label: 'Mass', value: s.mass },
  ].filter((row) => row.value.trim() !== '');
}

/** Status → badge color (design owned by the site, not content). */
export function rocketStatusColor(status: string): string {
  switch (status.trim().toLowerCase()) {
    case 'launched':
      return 'bg-green-600';
    case 'testing':
    case 'manufacturing':
      return 'bg-yellow-600';
    case 'in design':
    case 'concept':
      return 'bg-blue-600';
    case 'retired':
      return 'bg-neutral-600';
    default:
      return 'bg-gray-600';
  }
}
