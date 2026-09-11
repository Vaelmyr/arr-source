import type { SearchDbIdentity } from '../search/search.types.js';

export interface ProviderMediaIdentity extends SearchDbIdentity {
    id: string;

    canonicalTitle: string;
    aliases: string[];

    year?: number;
}

export interface ProviderTvShow extends ProviderMediaIdentity {
    type: 'tv';

    seasons?: number[];
}

export interface ProviderMovie extends ProviderMediaIdentity {
    type: 'movie';

    duration?: number;
}

export interface ProviderEpisode {
    id: string;

    seriesId: string;

    seasonNumber: number;
    episodeNumber: number;

    title?: string;

    duration?: number;
}

export type ProviderMedia = ProviderTvShow | ProviderMovie;

export interface ProviderRelease {
    id: string;
    mediaId: string;
    providerId: string;
    downloadId: string;

    type: 'movie' | 'episode';

    title: string;

    seasonNumber?: number;
    episodeNumber?: number;

    quality?: string;
    size?: number;

    publishedAt?: Date;
}
