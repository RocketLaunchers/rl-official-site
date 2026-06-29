import { AlbumSchema, type Album } from '../content/schema';
import { loadCollection } from './_load';

export type { Album };

const modules = import.meta.glob('../content/gallery/*.json', { eager: true });

export const albums: Album[] = loadCollection(modules, AlbumSchema, 'album').sort(
  (a, b) => a.displayOrder - b.displayOrder,
);

export const albumById = (id: string): Album | undefined => albums.find((a) => a.id === id);

export const albumsForSeason = (seasonId: string): Album[] =>
  albums.filter((a) => a.season === seasonId);
