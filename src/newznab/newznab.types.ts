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

export class NewznabItemAttributeDto {
    name: string;
    value: string | number;
}

export class NewznabSearchItemDto {
    title: string;

    guid: string;
    isPermaLink: boolean;

    pubDate: string;
    category?: string;

    enclosure: {
        url: string;
        length: number;
        type: 'application/x-nzb';
    };

    attributes: Array<NewznabItemAttributeDto>;
}

class NewznabCategoryDto {
    id: number;
    name: string;
    subcat?: Omit<NewznabCategoryDto, 'subcat'>;
}

class NewznabSearchSupportDto {
    available: 'yes' | 'no';
    supportedParams: string;
}

export type NewznabApiQuery =
    NewznabCapsQueryDto | NewznabSearchQueryDto | NewznabGetQueryDto;

export class NewznabBaseQueryDto {
    t: NewznabApiType;
    o?: NewznabOutputType;
    apikey?: string;

    [k: string]: any;
}

export class NewznabCapsQueryDto extends NewznabBaseQueryDto {
    declare t: NewznabApiType.CAPS;
}

export class NewznabCapsResponseDto {
    server: {
        version: string;
        title: string;
    };

    limits: {
        max: number;
        default: number;
    };

    searching: Partial<{
        search: NewznabSearchSupportDto;
        tvSearch: NewznabSearchSupportDto;
        movieSearch: NewznabSearchSupportDto;
    }>;

    categories: NewznabCategoryDto[];
}

export class NewznabSearchQueryDto extends NewznabBaseQueryDto {
    declare t:
        NewznabApiType.SEARCH | NewznabApiType.TV_SEARCH | NewznabApiType.MOVIE;

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

export class NewznabSearchResponseDto {
    title: string;
    description: string;

    offset: number;
    total: number;

    items: Array<NewznabSearchItemDto>;
}

export class NewznabGetQueryDto extends NewznabBaseQueryDto {
    declare t: NewznabApiType.GET;

    id: string;
    del?: 0 | 1;
}

export class NewznabGetResponseDto {
    downloadRef: string;
}
