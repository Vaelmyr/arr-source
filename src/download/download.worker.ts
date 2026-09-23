import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { DownloadStatus } from '../generated/prisma/enums.js';
import { ProvidersRegistry } from '../providers/providers.registry.js';
import { DownloadEvent } from './download.types.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FfmpegDownloader } from './downloaders/ffmpeg.downloader.js';

@Injectable()
export class DownloadWorker {
    private readonly logger = new Logger(DownloadWorker.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly providersRegistry: ProvidersRegistry,
        private readonly eventEmitter: EventEmitter2,
        private readonly ffmpegDownloader: FfmpegDownloader,
    ) {}

    /**
     * Run a download by claiming it, resolving the source, and downloading it using ffmpeg.
     */
    public async run(downloadId: string): Promise<void> {
        const download = await this.claim(downloadId);

        if (!download) {
            this.logger.warn(
                `Download with ID '${downloadId}' could not be claimed. It may have already been claimed or does not exist.`,
            );
            return;
        }

        try {
            const provider = this.providersRegistry.get(download.providerId);

            if (!provider) {
                throw new Error(
                    `Provider with ID '${download.providerId}' not found for Download ID '${downloadId}'.`,
                );
            }

            const source = await provider.resolveDownload(download.downloadRef);

            if (!source) {
                throw new Error(
                    `Failed to resolve download for Download ID '${downloadId}' using Provider ID '${download.providerId}'.`,
                );
            }

            const result = await this.ffmpegDownloader.download(source, {
                outputPath: download.tempPath!,
                onProgress: (progress) => {
                    this.logger.debug(
                        `Download ${download.id}: ${progress.outputBytes} bytes`,
                    );
                },
            });

            await this.prisma.download.update({
                where: { id: download.id },
                data: {
                    status: DownloadStatus.COMPLETED,
                    outputPath: result.outputPath,
                    totalBytes: result.totalBytes,
                    completedAt: new Date(),
                    error: null,
                },
            });

            this.eventEmitter.emit(DownloadEvent.COMPLETED, {
                downloadId: download.id,
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Download with ID '${downloadId}' failed: ${message}`,
                error instanceof Error ? error.stack : undefined,
            );

            await this.prisma.download.update({
                where: { id: download.id },
                data: {
                    status: DownloadStatus.FAILED,
                    completedAt: new Date(),
                    error: message,
                },
            });

            this.eventEmitter.emit(DownloadEvent.FAILED, {
                downloadId: download.id,
            });
        }
    }

    private async claim(downloadId: string) {
        const result = await this.prisma.download.updateMany({
            where: {
                id: downloadId,
                status: DownloadStatus.QUEUED,
            },
            data: {
                status: DownloadStatus.DOWNLOADING,
                startedAt: new Date(),
                completedAt: null,
                error: null,
            },
        });

        if (result.count !== 1) {
            return;
        }

        return this.prisma.download.findUniqueOrThrow({
            where: { id: downloadId },
        });
    }
}
