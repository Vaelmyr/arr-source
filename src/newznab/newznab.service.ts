import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import type {
    NewznabCapsResponseDto,
    NewznabGetQueryDto,
    NewznabGetResponseDto,
    NewznabSearchQueryDto,
    NewznabSearchResponseDto,
} from './newznab.types.js';
import { SearchService } from '../search/search.service.js';

@Injectable()
export class NewznabService {
    private readonly logger = new Logger(NewznabService.name);

    constructor(private readonly searchService: SearchService) {}

    /**
     * The `CAPS` function is used to query the server for supported features and
     * the protocol version and other meta data relevant to the implementation.
     * @see https://newznab.readthedocs.io/en/latest/misc/api.html#caps
     */
    //TODO: Understand if there is a way to determine automatically the parameters
    //TODO: supported by the search endpoint, and the categories supported by the server.
    public caps(): NewznabCapsResponseDto {
        this.logger.debug('Returning capabilities for Newznab API');

        return {
            server: {
                version: '1.0',
                title: 'Newznab',
            },
            limits: {
                max: 100,
                default: 25,
            },
            searching: {
                search: {
                    available: 'yes',
                    supportedParams: 'q',
                },
                tvSearch: {
                    available: 'yes',
                    supportedParams: 'q,season,ep',
                },
                movieSearch: {
                    available: 'no',
                    supportedParams: 'q',
                },
            },
            categories: [
                {
                    id: 2000,
                    name: 'Movies',
                },
                {
                    id: 5000,
                    name: 'TV',
                    subcat: {
                        id: 5070,
                        name: 'Anime',
                    },
                },
            ],
        };
    }

    /**
     * The `SEARCH` function searches the index for items matching the search criteria.
     * @see https://newznab.readthedocs.io/en/latest/misc/api.html#search
     */
    public async search(
        query: NewznabSearchQueryDto,
    ): Promise<NewznabSearchResponseDto> {
        this.logger.debug(`Searching for query: ${JSON.stringify(query)}`);

        return this.searchService.search(query);
    }

    /**
     * The `GET` function returns an nzb for a guid.
     * @see https://newznab.readthedocs.io/en/latest/misc/api.html#get
     */
    //TODO: Properly implement the GET function to return the actual NZB file.
    public get(query: NewznabGetQueryDto): NewznabGetResponseDto {
        this.logger.debug('Returning NZB file for GET request');
        let downloadRef: string;

        try {
            downloadRef = JSON.parse(atob(query.id));
            this.logger.debug(
                `Parsed download reference: ${JSON.stringify(downloadRef)}`,
            );
        } catch {
            this.logger.error('Failed to parse download reference');
            throw new InternalServerErrorException(
                'Invalid download reference',
            );
        }

        return {
            downloadRef: query.id,
        };
    }
}
