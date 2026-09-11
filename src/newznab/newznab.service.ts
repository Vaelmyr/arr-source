import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import type {
    NewznabCapsResponse,
    NewznabSearchQuery,
    NewznabSearchResponse,
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
    public caps(): NewznabCapsResponse {
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
        query: NewznabSearchQuery,
    ): Promise<NewznabSearchResponse> {
        this.logger.debug(`Searching for query: ${JSON.stringify(query)}`);

        return this.searchService.search(query);
    }

    /**
     * The `GET` function returns an nzb for a guid.
     * @see https://newznab.readthedocs.io/en/latest/misc/api.html#get
     */
    public get() {
        this.logger.debug('Returning NZB file for GET request');

        const obj = {
            nzb: {
                '@xmlns': 'http://www.newzbin.com/DTD/2003/nzb',
            },
        };

        return create({
            version: '1.0',
            encoding: 'UTF-8',
        })
            .dtd({
                pubID: '-//newzBin//DTD NZB 1.1//EN',
                sysID: 'http://www.newzbin.com/DTD/nzb/nzb-1.1.dtd',
            })
            .ele(obj)
            .end({ prettyPrint: true });
    }
}
