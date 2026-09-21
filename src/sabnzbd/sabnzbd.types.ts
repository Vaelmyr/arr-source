export enum SabnzbdApiMode {
    VERSION = 'version',
    GET_CONFIG = 'get_config',
    ADD_FILE = 'addfile',
    QUEUE = 'queue',
    HISTORY = 'history',
    RETRY = 'retry',
}

export class SabnzbdBaseQueryDto {
    mode: SabnzbdApiMode;
    output: 'json';
    apikey?: string;

    [k: string]: any;
}

export type SabnzbdApiQuery =
    SabnzbdVersionQueryDto | SabnzbdGetConfigQueryDto | SabnzbdAddFileQueryDto;

export class SabnzbdVersionQueryDto extends SabnzbdBaseQueryDto {
    declare mode: SabnzbdApiMode.VERSION;
}

export class SabnzbdVersionResponseDto {
    version: string;
}

export class SabnzbdGetConfigQueryDto extends SabnzbdBaseQueryDto {
    declare mode: SabnzbdApiMode.GET_CONFIG;
}

export class SabnzbdGetConfigResponseDto {
    config: {
        misc: {
            complete_dir: string;
            pre_check: boolean;

            enable_tv_sorting: boolean;
            tv_categories: string;

            enable_movie_sorting: boolean;
            movie_categories: string;

            enable_date_sorting: boolean;
            date_categories: string;

            history_retention: string;
            history_retention_option: 'all' | 'number';
            history_retention_number: number;
        };

        categories: Array<{
            name: string;
            dir: string;
        }>;

        sorters: Array<{
            name: string;
            type: 'tv' | 'movie' | 'date';
            cat: string;
        }>;
    };
}

export class SabnzbdAddFileQueryDto extends SabnzbdBaseQueryDto {
    declare mode: SabnzbdApiMode.ADD_FILE;
}

export class SabnzbdAddFileResponseDto {}

export class SabnzbdUploadedFileXmlObject {
    nzb: {
        '@xmlns': string;
        head: {
            meta: {
                '@type': 'X-Private-Download-Ref';
                '#': string;
            };
        };
        file: {
            '@poster': string;
            '@date': string;
            '@subject': string;
            groups: {
                group: string;
            };
            segments: {
                segment: {
                    '@bytes': string;
                    '@number': string;
                    '#': string;
                };
            };
        };
    };
}
