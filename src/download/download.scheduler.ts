import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DownloadEvent, DownloadEventPayload } from './download.types.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service.js';
import { DownloadStatus } from '../generated/prisma/enums.js';
import { DownloadWorker } from './download.worker.js';

//TODO: Implement a PriorityQueue instead of using a Set for pending downloads, to allow prioritization of downloads based on the priority returned by the `addfile`
@Injectable()
export class DownloadScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(DownloadScheduler.name);

    private readonly MAX_CONCURRENT_DOWNLOADS: number = 1;

    private pending = new Set<string>();
    private running = new Set<string>();

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly worker: DownloadWorker,
    ) {
        this.MAX_CONCURRENT_DOWNLOADS = this.config.get<number>(
            'MAX_CONCURRENT_DOWNLOADS',
            1,
        );
    }

    //TODO: Should probably handle `DOWNLOADING` state differently, as it may indicate an interrupted download that needs to be resumed, rather than just re-queued.
    async onApplicationBootstrap() {
        const downloads = await this.prisma.download.findMany({
            select: {
                id: true,
            },
            where: {
                status: {
                    in: [DownloadStatus.QUEUED, DownloadStatus.DOWNLOADING],
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        this.logger.debug(`Found ${downloads.length} downloads to reconcile.`);

        for (const download of downloads) {
            this.enqueue(download.id);
        }
    }

    public enqueue(downloadId: string): void {
        this.logger.debug(`Enqueuing download with ID '${downloadId}'`);
        this.eventEmitter.emit(DownloadEvent.QUEUED, { downloadId });
    }

    @OnEvent(DownloadEvent.QUEUED)
    handleQueued({ downloadId }: DownloadEventPayload): void {
        if (this.pending.has(downloadId)) {
            this.logger.warn(
                `Download ${downloadId} is already in the pending queue.`,
            );
            return;
        }

        if (this.running.has(downloadId)) {
            this.logger.warn(`Download ${downloadId} is already running.`);
            return;
        }

        this.logger.debug(
            `Adding download ${downloadId} to the pending queue.`,
        );

        this.pending.add(downloadId);
        this.schedule();
    }

    @OnEvent(DownloadEvent.COMPLETED)
    @OnEvent(DownloadEvent.FAILED)
    handleCompletedOrFailed({ downloadId }: DownloadEventPayload): void {
        this.logger.debug(`Download ${downloadId} completed or failed.`);

        this.running.delete(downloadId);
        this.schedule();
    }

    @OnEvent(DownloadEvent.PAUSED)
    handlePaused({ downloadId }: DownloadEventPayload): void {
        this.logger.debug(`Download ${downloadId} paused.`);

        this.pending.delete(downloadId);

        if (this.running.has(downloadId)) {
            // await this.worker.pause(downloadId);
            this.running.delete(downloadId);
        }

        this.schedule();
    }

    @OnEvent(DownloadEvent.RESUMED)
    handleResumed({ downloadId }: DownloadEventPayload): void {
        this.logger.debug(`Download ${downloadId} resumed.`);

        this.enqueue(downloadId);
    }

    private schedule(): void {
        while (
            this.running.size < this.MAX_CONCURRENT_DOWNLOADS &&
            this.pending.size > 0
        ) {
            const downloadId = this.pending.values().next().value;

            if (!downloadId) {
                this.logger.error(
                    'Failed to retrieve download ID from pending queue.',
                );

                continue;
            }

            this.pending.delete(downloadId);
            this.running.add(downloadId);

            this.logger.debug(
                `Starting download ${downloadId}. Running=${this.running.size}, Pending=${this.pending.size}`,
            );

            void this.worker.run(downloadId);
        }
    }
}
