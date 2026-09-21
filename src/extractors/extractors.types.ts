export class HlsStreamDto {
    url: string;

    width?: number;
    height?: number;
    quality?: string;

    bandwidth?: number;
    codecs?: string[];

    audioTracks?: HlsStreamAudioTrackDto[];
    subtitleTracks?: HlsStreamSubtitleTrackDto[];
}

export class HlsStreamAudioTrackDto {
    url: string;
    name?: string;
    language?: string;

    default: boolean;
    forced?: boolean;
}

export class HlsStreamSubtitleTrackDto {
    url: string;
    name?: string;
    language?: string;

    default: boolean;
    forced?: boolean;
}
