export enum DownloadEvent {
    QUEUED = 'download.queued',
    STARTED = 'download.started',
    PAUSED = 'download.paused',
    RESUMED = 'download.resumed',
    COMPLETED = 'download.completed',
    FAILED = 'download.failed',
}

export class DownloadEventPayload {
    downloadId: string;
}

export class DownloadResultDto {
    outputPath: string;
    totalBytes: bigint;
}

export class DownloadOptionsDto {
    outputPath: string;
    onProgress?: (progress: DownloadProgressDto) => void;
}

export class DownloadProgressDto {
    outputBytes: bigint;
    outTimeSeconds: number;
    speed?: number;
}
