import { JsonValue } from '@prisma/client/runtime/client';
import { Download, DownloadStatus } from './generated/prisma/client.js';

export class DownloadDto implements Download {
    id: string;

    providerId: string;
    itemId: string;
    titleId: string;

    title: string;
    category: string | null;

    downloadRef: JsonValue;

    status: DownloadStatus;
    priority: number;

    totalBytes: bigint | null;
    downloadedBytes: bigint;

    outputPath: string | null;
    tempPath: string | null;

    error: string | null;

    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
}
