export type Img = { quality?: string; url: string };

export type ArtistRef = {
  id: string;
  name: string;
  role?: string;
  type?: string;
  url?: string;
  image?: Img[];
};

export type Credits = { primary?: ArtistRef[]; featured?: ArtistRef[]; all?: ArtistRef[] };

export type Song = {
  id: string;
  name: string;
  type?: string;
  year?: string | null;
  duration?: number | null;
  language?: string;
  label?: string | null;
  explicitContent?: boolean;
  playCount?: number | null;
  hasLyrics?: boolean;
  lyricsId?: string | null;
  url?: string;
  album?: { id?: string | null; name?: string | null; url?: string | null };
  artists?: Credits;
  image?: Img[];
  downloadUrl?: Img[];
};

export type AlbumLite = {
  id: string;
  name: string;
  description?: string;
  year?: string | null;
  type?: string;
  language?: string;
  songCount?: number | null;
  artists?: Credits;
  image?: Img[];
};

export type Album = AlbumLite & { songs?: Song[]; playCount?: number | null; explicitContent?: boolean };

export type PlaylistLite = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  language?: string;
  songCount?: number | null;
  image?: Img[];
};

export type Playlist = PlaylistLite & { songs?: Song[]; followerCount?: number | null; year?: string | null };

export type ArtistLite = {
  id: string;
  name: string;
  role?: string;
  type?: string;
  image?: Img[];
};

export type Artist = ArtistLite & {
  followerCount?: number | string | null;
  fanCount?: number | string | null;
  isVerified?: boolean;
  dominantLanguage?: string;
  bio?: unknown;
  topSongs?: Song[];
  topAlbums?: AlbumLite[];
  singles?: AlbumLite[];
  similarArtists?: ArtistLite[];
};

export type MediaKind = 'album' | 'artist' | 'playlist';

/** Slim reference to something the user saved (album / artist / playlist). */
export type MediaItem = { id: string; kind: MediaKind; title: string; subtitle?: string; image: string };

export type UserPlaylist = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  songs: Song[];
};

export type AudioQuality = 'low' | 'normal' | 'high';
export type RepeatMode = 'off' | 'all' | 'one';

/** The part of the library that is synced to the cloud (history and recent searches stay on the device). */
export type SyncPayload = { favorites: Song[]; saved: MediaItem[]; playlists: UserPlaylist[]; quality: AudioQuality };
