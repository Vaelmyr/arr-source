export class VixcloudWindowPropertiesDto {
    video?: {
        id: string;
        filename: string;
    };

    streams?: Array<{
        name: string;
        active: boolean;
        url: string;
    }>;

    masterPlaylist?: {
        params: {
            token: string;
            expires: string;
            asn: string;
        };
        url: string;
    };

    canPlayFHD?: boolean;
    thumbnailsUrl?: string;
    downloadUrl?: string;
}
