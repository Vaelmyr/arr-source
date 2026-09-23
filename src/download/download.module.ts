import { Module } from '@nestjs/common';
import { DownloadScheduler } from './download.scheduler.js';
import { PrismaService } from '../prisma.service.js';
import { DownloadWorker } from './download.worker.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { FfmpegDownloader } from './downloaders/ffmpeg.downloader.js';

@Module({
    imports: [ProvidersModule],
    providers: [
        PrismaService,
        DownloadScheduler,
        DownloadWorker,
        FfmpegDownloader,
    ],
    exports: [DownloadScheduler],
})
export class DownloadModule {}
