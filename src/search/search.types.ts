export enum SearchMediaType {
    TV = 'tv',
    MOVIE = 'movie',
}

export class SearchDbIdentityDto {
    tvdbId?: number;
    tmdbId?: number;
    imdbId?: string;
}

export class SearchRequestDto extends SearchDbIdentityDto {
    type: SearchMediaType;

    query?: string;

    seasonNumber?: number;
    episodeNumber?: number;

    isBrowse?: boolean;
}
