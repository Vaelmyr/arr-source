export const SEARCH_PROVIDERS = Symbol('SEARCH_PROVIDERS');

export class ProviderMediaDto {
    type: 'tv' | 'movie';

    id: string;

    canonicalTitle: string;
    aliases: string[];

    tvdbId?: number;
    tmdbId?: number;
    imdbId?: string;
}

export class ProviderBaseDownloadRefDto {
    providerId: string;
    itemId: string;

    data: unknown;
}

export class ProviderReleaseDto<TDownloadRefDto = ProviderBaseDownloadRefDto> {
    id: string;
    providerId: string;

    title: string;
    episodeTitle?: string;

    seasonNumber?: number;
    episodeNumber?: string | number;

    size?: number;
    quality: string;

    publishedAt?: Date;

    tvdbId?: number;
    imdbId?: string;

    audioLanguages: string[];
    subtitleLanguages: string[];

    downloadRef: TDownloadRefDto;
}
