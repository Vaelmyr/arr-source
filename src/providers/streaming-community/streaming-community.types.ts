import { HlsStreamAudioTrackDto } from '../../extractors/extractors.types.js';
import { ProviderBaseDownloadRefDto } from '../providers.types.js';

export enum StreamingCommunityLocale {
    IT = 'it',
    EN = 'en',
}

export class StreamingCommunityMediaDto {
    id: number;
    slug: string;
    name: string;

    type: 'tv' | 'movie';
    quality?: string;

    tmdb_id?: string;
}

export class StreamingCommunitySeasonDto {
    id: number;
    number: number;
    title_id: number;

    name?: string;
    plot?: string;

    episodes: Array<StreamingCommunityEpisodeDto>;
}

export class StreamingCommunityEpisodeDto {
    id: number;
    scws_id: number;
    season_id: number;
    number: number | string;

    name?: string;
    plot?: string;

    quality?: string;
    size?: number;

    created_at?: string;
    updated_at?: string;
    uploaded_at?: string;
}
export class StreamingCommunitySearchResponseDto {
    data: StreamingCommunityMediaDto[];

    current_page?: number;
    last_page?: number;
}

export class StreamingCommunityReleaseDto {
    type: 'movie' | 'episode';

    id: string;

    mediaTitle: string;
    episodeTitle?: string;

    seasonNumber?: number;
    episodeNumber?: string | number;

    quality?: string;

    publishedAt?: Date;

    streamUrl: string;
    audioTracks?: HlsStreamAudioTrackDto[];
    subtitleTracks?: HlsStreamAudioTrackDto[];
}

export class StreamingCommunityPageJsonDto {
    props: {
        loadedSeason: StreamingCommunitySeasonDto;
    };
}

export class StreamingCommunityDownloadRefDto implements ProviderBaseDownloadRefDto {
    providerId: 'streaming-community';
    data: {
        type: 'episode';
        id: string;
        quality?: string;
        language?: StreamingCommunityLocale;
    };
}
