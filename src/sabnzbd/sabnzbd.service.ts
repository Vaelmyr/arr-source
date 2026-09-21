import { BadRequestException, Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import type {
    SabnzbdAddFileQueryDto,
    SabnzbdVersionResponseDto,
    SabnzbdUploadedFileXmlObject,
    SabnzbdGetConfigResponseDto,
    SabnzbdAddFileResponseDto,
} from './sabnzbd.types.js';

@Injectable()
export class SabnzbdService {
    private readonly SABNZBD_VERSION = '5.1.0';

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
    //TODO: Implement a proper NZB file handling system to process the uploaded NZB files and add them to the SABnzbd queue.
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

        const downloadRef = JSON.parse(atob(parsedXml.nzb.head.meta['#']));

        return {};
    }
}
