export enum StreamingCommunityLocale {
    IT = 'it',
    EN = 'en',
}

export interface StreamingCommunitySearchResponse {
    data: StreamingCommunityShow[];

    current_page?: number;
    last_page?: number;
}

export interface StreamingCommunityShow {
    id: number;
    slug: string;

    name: string;

    type: string;
    quality?: string;

    tmdb_id?: string;
}

export interface StreamingCommunityParsedPage {
    props: {
        loadedSeason: StreamingCommunitySeason;
    };
}

export interface StreamingCommunitySeason {
    id: number;
    number: number;

    name?: string;
    plot?: string;

    title_id: number;

    episodes: StreamingCommunityEpisode[];
}

export interface StreamingCommunityEpisode {
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
