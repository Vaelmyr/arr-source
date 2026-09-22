import {
    createMap,
    forMember,
    fromValue,
    mapFrom,
    mapWithArguments,
    type Mapper,
    type MappingProfile,
} from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import {
    SabnzbdHistorySlotDto,
    SabnzbdDownloadPriority,
    SabnzbdQueueSlotDto,
    SabnzbdDownloadStatus,
    SabnzbdQueuePriority,
} from './sabnzbd.types.js';
import { DownloadStatus } from '../generated/prisma/client.js';
import { DownloadDto } from '../prisma.types.js';

@Injectable()
export class SabnzbdMapper extends AutomapperProfile {
    constructor(@InjectMapper() readonly mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            // DownloadDto -> SabnzbdQueueSlotDto
            createMap(
                mapper,
                DownloadDto,
                SabnzbdQueueSlotDto,
                forMember(
                    (d) => d.nzo_id,
                    mapFrom((s) => s.id),
                ),
                forMember(
                    (d) => d.filename,
                    mapFrom((s) => s.title),
                ),
                forMember(
                    (d) => d.index,
                    mapWithArguments((_s, { index }) => index ?? 0),
                ),
                forMember(
                    (d) => d.status,
                    mapFrom((s) => this.mapSabnzbdStatus(s.status)),
                ),
                forMember(
                    (d) => d.priority,
                    mapFrom((s) =>
                        this.mapSabnzbdPriority(Number(s.priority ?? -100)),
                    ),
                ),
                forMember(
                    (d) => d.cat,
                    mapFrom((s) => s.category ?? 'tv'),
                ),
                forMember(
                    (d) => d.mb,
                    mapFrom((s) => this.bytesToMb(s.totalBytes ?? 0n)),
                ),
                forMember(
                    (d) => d.mbleft,
                    mapFrom((s) =>
                        this.bytesToMb(
                            this.getRemainingBytes(
                                s.totalBytes,
                                s.downloadedBytes,
                            ),
                        ),
                    ),
                ),
                forMember(
                    (d) => d.percentage,
                    mapFrom((s) =>
                        this.getPercentage(s.totalBytes, s.downloadedBytes),
                    ),
                ),
                forMember((d) => d.timeleft, fromValue('0:00:00')),
            );

            // DownloadDto -> SabnzbdHistorySlotDto
            createMap(
                mapper,
                DownloadDto,
                SabnzbdHistorySlotDto,
                forMember(
                    (d) => d.nzo_id,
                    mapFrom((s) => s.id),
                ),
                forMember(
                    (d) => d.name,
                    mapFrom((s) => s.title),
                ),
                forMember(
                    (d) => d.nzb_name,
                    mapFrom((s) => `${s.title}.nzb`),
                ),
                forMember(
                    (d) => d.cat,
                    mapFrom((s) => s.category ?? 'tv'),
                ),
                forMember(
                    (d) => d.status,
                    mapFrom((s) => this.mapSabnzbdStatus(s.status)),
                ),
                forMember(
                    (d) => d.bytes,
                    mapFrom((s) => Number(s.totalBytes ?? 0n)),
                ),
                forMember(
                    (d) => d.storage,
                    mapFrom((s) => s.outputPath ?? ''),
                ),
                forMember(
                    (d) => d.fail_message,
                    mapFrom((s) => s.error ?? ''),
                ),
                forMember(
                    (d) => d.download_time,
                    mapFrom((s) => {
                        if (!s.startedAt || !s.completedAt) {
                            return 0;
                        }

                        return Math.floor(
                            (s.completedAt.getTime() - s.startedAt.getTime()) /
                                1000,
                        );
                    }),
                ),
            );
        };
    }

    private mapSabnzbdStatus(status: DownloadStatus): SabnzbdDownloadStatus {
        switch (status) {
            case DownloadStatus.QUEUED:
                return SabnzbdDownloadStatus.QUEUED;
            case DownloadStatus.DOWNLOADING:
                return SabnzbdDownloadStatus.DOWNLOADING;
            case DownloadStatus.PAUSED:
                return SabnzbdDownloadStatus.PAUSED;
            case DownloadStatus.COMPLETED:
                return SabnzbdDownloadStatus.COMPLETED;
            case DownloadStatus.FAILED:
                return SabnzbdDownloadStatus.FAILED;
            default:
                return SabnzbdDownloadStatus.UNKNOWN;
        }
    }

    private mapSabnzbdPriority(priority: number): SabnzbdQueuePriority {
        switch (priority) {
            case -2:
                return SabnzbdQueuePriority.PAUSED;
            case -1:
                return SabnzbdQueuePriority.LOW;
            case 1:
                return SabnzbdQueuePriority.HIGH;
            case 2:
                return SabnzbdQueuePriority.FORCE;
            case -100:
            case 0:
            default:
                return SabnzbdQueuePriority.NORMAL;
        }
    }

    private bytesToMb(bytes: bigint): string {
        const mb = Number(bytes) / (1024 * 1024);
        return mb.toFixed(2);
    }

    private getRemainingBytes(
        totalBytes: bigint | null,
        downloadedBytes: bigint,
    ): bigint {
        if (totalBytes === null) {
            return 0n;
        }

        if (downloadedBytes >= totalBytes) {
            return 0n;
        }

        return totalBytes - downloadedBytes;
    }

    private getPercentage(
        totalBytes: bigint | null,
        downloadedBytes: bigint,
    ): number {
        if (totalBytes === null || totalBytes === 0n) {
            return 0;
        }

        return Math.min(
            100,
            Math.round((Number(downloadedBytes) / Number(totalBytes)) * 100),
        );
    }
}
