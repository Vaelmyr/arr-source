import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import {
    type SabnzbdAddFileQueryDto,
    type SabnzbdVersionResponseDto,
    type SabnzbdUploadedFileXmlObject,
    type SabnzbdGetConfigResponseDto,
    type SabnzbdAddFileResponseDto,
    type SabnzbdQueueResponseDto,
    SabnzbdQueueSlotDto,
    SabnzbdHistoryResponseDto,
    SabnzbdHistorySlotDto,
} from './sabnzbd.types.js';
import { PrismaService } from '../prisma.service.js';
import { DownloadStatus } from '../generated/prisma/enums.js';
import { ProviderBaseDownloadRefDto } from '../providers/providers.types.js';
import type { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { DownloadDto } from '../prisma.types.js';
import { DownloadScheduler } from '../download/download.scheduler.js';
import { InputJsonObject } from '@prisma/client/runtime/client';
import path from 'path';

@Injectable()
export class SabnzbdService {
    private readonly logger = new Logger(SabnzbdService.name);

    private readonly SABNZBD_VERSION = '5.1.0';

    constructor(
        @InjectMapper() readonly mapper: Mapper,
        private readonly prisma: PrismaService,
        private readonly downloadScheduler: DownloadScheduler,
    ) {}

    /**
     * Get version of running SABnzbd
     */
    async version(): Promise<SabnzbdVersionResponseDto> {
        return {
            version: this.SABNZBD_VERSION,
        };
    }

    /**
     * Get value of configuration item
     * @see https://sabnzbd.org/wiki/configuration/5.1/api#get_config
     */
    //TODO: Implement a proper configuration management system to handle the SABnzbd configuration.
    async getConfig(): Promise<SabnzbdGetConfigResponseDto> {
        return {
            config: {
                misc: {
                    complete_dir: '/downloads',
                    pre_check: false,

                    enable_tv_sorting: false,
                    tv_categories: '',

                    enable_movie_sorting: false,
                    movie_categories: '',

                    enable_date_sorting: false,
                    date_categories: '',

                    history_retention: '',
                    history_retention_option: 'all',
                    history_retention_number: 0,
                },

                categories: [
                    {
                        name: 'tv',
                        dir: 'tv',
                    },
                ],

                sorters: [],
            },
        };
    }

    /**
     * Add NZB by file upload
     * @see https://sabnzbd.org/wiki/configuration/5.1/api#addfile
     */
    async addFile(
        query: SabnzbdAddFileQueryDto,
        file: Express.Multer.File,
    ): Promise<SabnzbdAddFileResponseDto> {
        const buffer = file.buffer.toString('utf-8');
        const parsedXml = create(buffer).end({
            format: 'object',
        }) as unknown as SabnzbdUploadedFileXmlObject;

        if (
            parsedXml.nzb.head.meta['@type'] !== 'X-Private-Download-Ref' ||
            !parsedXml.nzb.head.meta['#']
        ) {
            throw new BadRequestException(
                'Invalid NZB file: missing X-Private-Download-Ref meta tag',
            );
        }

        const downloadRef = parsedXml.nzb.head.meta['#'];
        let parsedDownloadRef: ProviderBaseDownloadRefDto & { title: string };

        try {
            parsedDownloadRef = JSON.parse(
                Buffer.from(downloadRef, 'base64').toString('utf-8'),
            );
        } catch (error) {
            throw new BadRequestException(
                'Invalid NZB file: X-Private-Download-Ref meta tag is not a valid base64-encoded JSON string',
            );
        }

        //TODO: Get download dir from config
        const downloadsDir = '.dev/downloads';

        const tempPath = path.join(
            downloadsDir,
            '.partial',
            `${parsedDownloadRef.title}.mkv`,
        );

        const outputPath = path.join(
            downloadsDir,
            `${parsedDownloadRef.title}.mkv`,
        );

        const download = await this.prisma.download.create({
            data: {
                id: `SABnzbd_nzo_${crypto.randomUUID()}`,
                providerId: parsedDownloadRef.providerId,
                itemId: parsedDownloadRef.itemId,
                title: parsedDownloadRef.title,
                tempPath,
                outputPath,
                downloadRef: parsedDownloadRef.data as InputJsonObject,
                category: query.cat,
                priority: Number(query.priority ?? -100),
                status: DownloadStatus.QUEUED,
            },
        });

        this.downloadScheduler.enqueue(download.id);

        this.logger.debug(
            `Created download entry with ID '${download.id}' for provider '${parsedDownloadRef.providerId}' and item '${parsedDownloadRef.title}'`,
        );

        return {
            status: true,
            nzo_ids: [download.id],
        };
    }

    /**
     * Get the current queue of downloads
     * @see https://sabnzbd.org/wiki/configuration/5.1/api#queue
     */
    async queue(): Promise<SabnzbdQueueResponseDto> {
        const downloads = await this.prisma.download.findMany({
            where: {
                status: {
                    in: [
                        DownloadStatus.QUEUED,
                        DownloadStatus.DOWNLOADING,
                        DownloadStatus.PAUSED,
                    ],
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        const slots = downloads.map((download, index) =>
            this.mapper.map(download, DownloadDto, SabnzbdQueueSlotDto, {
                extraArgs: () => ({ index }),
            }),
        );

        this.logger.debug(
            `Returning ${slots.length} slots in the queue response for SABnzbd`,
            JSON.stringify(slots, undefined, 2),
        );

        return {
            queue: {
                paused: false,
                slots,
            },
        };
    }

    /**
     * Get the history of completed and failed downloads
     * @see https://sabnzbd.org/wiki/configuration/5.1/api#history
     */
    async history(): Promise<SabnzbdHistoryResponseDto> {
        const downloads = await this.prisma.download.findMany({
            where: {
                status: {
                    in: [DownloadStatus.COMPLETED, DownloadStatus.FAILED],
                },
            },
            orderBy: {
                completedAt: 'desc',
            },
        });

        return {
            history: {
                slots: this.mapper.mapArray(
                    downloads,
                    DownloadDto,
                    SabnzbdHistorySlotDto,
                ),
            },
        };
    }
}
