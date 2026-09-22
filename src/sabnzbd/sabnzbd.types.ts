export enum SabnzbdApiMode {
    VERSION = 'version',
    GET_CONFIG = 'get_config',
    ADD_FILE = 'addfile',
    QUEUE = 'queue',
    HISTORY = 'history',
    RETRY = 'retry',
}

export enum SabnzbdDownloadStatus {
    UNKNOWN = 'Unknown',
    QUEUED = 'Queued',
    DOWNLOADING = 'Downloading',
    PAUSED = 'Paused',
    COMPLETED = 'Completed',
    FAILED = 'Failed',
}

export enum SabnzbdDownloadPriority {
    DEFAULT = -100,
    PAUSED = -2,
    LOW = -1,
    NORMAL = 0,
    HIGH = 1,
    FORCE = 2,
}

export enum SabnzbdQueuePriority {
    PAUSED = 'Paused',
    LOW = 'Low',
    NORMAL = 'Normal',
    HIGH = 'High',
    FORCE = 'Force',
}

export type SabnzbdApiQuery =
    | SabnzbdVersionQueryDto
    | SabnzbdGetConfigQueryDto
    | SabnzbdAddFileQueryDto
    | SabnzbdQueueQueryDto
    | SabnzbdHistoryQueryDto;

export class SabnzbdBaseQueryDto {
    mode: SabnzbdApiMode;
    output: 'json';
    apikey?: string;

    [k: string]: any;
}

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

    cat?: string;
    priority: number;
}

export class SabnzbdAddFileResponseDto {
    status: boolean;
    nzo_ids: string[];
}

export class SabnzbdQueueQueryDto extends SabnzbdBaseQueryDto {
    declare mode: SabnzbdApiMode.QUEUE;
}

export class SabnzbdQueueResponseDto {
    queue: {
        paused: boolean;
        slots: SabnzbdQueueSlotDto[];
    };
}

export class SabnzbdQueueSlotDto {
    nzo_id: string;
    filename: string;

    index: number;
    status: SabnzbdDownloadStatus;

    priority: SabnzbdQueuePriority;
    cat: string;

    timeleft: string;
    mb: string;
    mbleft: string;
    percentage: number;
}

export class SabnzbdHistoryQueryDto extends SabnzbdBaseQueryDto {
    declare mode: SabnzbdApiMode.HISTORY;
}

export class SabnzbdHistoryResponseDto {
    history: {
        slots: SabnzbdHistorySlotDto[];
    };
}

export class SabnzbdHistorySlotDto {
    nzo_id: string;

    name: string;
    nzb_name: string;

    cat: string;
    status: SabnzbdDownloadStatus;

    bytes: number;
    storage: string;

    fail_message: string;
    download_time: number;
}

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
