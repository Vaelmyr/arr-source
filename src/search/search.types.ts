export enum SearchMediaType {
    TV = 'tv',
    MOVIE = 'movie',
}

export interface SearchDbIdentity {
    tvdbId?: number;
    tmdbId?: number;
    imdbId?: string;
}

export interface SearchRequest extends SearchDbIdentity {
    type: SearchMediaType;

    query?: string;

    seasonNumber?: number;
    episodeNumber?: number;

    isBrowse?: boolean;
}
