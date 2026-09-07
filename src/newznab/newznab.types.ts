export enum NewznabApiType {
    CAPS = 'caps',
    SEARCH = 'search',
    TV_SEARCH = 'tvsearch',
    MOVIE = 'movie',
    GET = 'get',
}

export enum NewznabOutputType {
    XML = 'xml',
    JSON = 'json',
}

export interface NewznabBaseQuery {
    t: NewznabApiType;
    o?: NewznabOutputType;

    [k: string]: any;
}

export interface NewznabCapsQuery extends NewznabBaseQuery {
    t: NewznabApiType.CAPS;
}

export interface NewznabSearchQuery extends NewznabBaseQuery {
    t: NewznabApiType.SEARCH | NewznabApiType.TV_SEARCH | NewznabApiType.MOVIE;
    apikey: string;

    q?: string;
    title?: string;

    tvdbid?: string;
    imdbid?: string;
    rid?: string;
    tvmazeid?: string;
    tmdbid?: string;

    season?: string;
    ep?: string;
    cat?: string;

    limit?: number;
    offset?: number;

    extended?: 0 | 1;
}

export interface NewznabGetQuery extends NewznabBaseQuery {
    t: NewznabApiType.GET;
    apikey: string;

    id: string;
    del?: 0 | 1;
}

export type NewznabApiQuery =
    NewznabCapsQuery | NewznabSearchQuery | NewznabGetQuery;

interface NewznabSearchSupport {
    available: 'yes' | 'no';
    supportedParams: string;
}

interface NewznabCategory {
    id: number;
    name: string;
    subcat?: Omit<NewznabCategory, 'subcat'>;
}

export interface NewznabCapsResponse {
    server: {
        version: string;
        title: string;
    };

    limits: {
        max: number;
        default: number;
    };

    searching: Partial<{
        search: NewznabSearchSupport;
        tvSearch: NewznabSearchSupport;
        movieSearch: NewznabSearchSupport;
    }>;

    categories: NewznabCategory[];
}

interface NewznabSearchItem {
    title: string;
    isPermaLink: boolean;
    guid: string;
    pubDate: string;
    category: string;

    enclosure: {
        url: string;
        length: number;
        type: string;
    };

    attributes: Record<string, string | number>;
}

export interface NewznabSearchResponse {
    title: string;
    description: string;

    offset: number;
    total: number;

    items: NewznabSearchItem[];
}

export interface NewznabGetResponse {}
