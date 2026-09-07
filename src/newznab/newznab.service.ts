import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import type {
    NewznabCapsResponse,
    NewznabSearchQuery,
    NewznabSearchResponse,
} from './newznab.types.js';

@Injectable()
export class NewznabService {
    private readonly logger = new Logger(NewznabService.name);

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
    public search(query: NewznabSearchQuery): NewznabSearchResponse {
        this.logger.debug(`Searching for query: ${JSON.stringify(query)}`);

        return {
            title: 'Search Results',
            description: 'Search results from Newznab API',
            offset: query.offset ?? 0,
            total: 1,
            items: [
                {
                    title: 'Test.Series.S01E01.1080p',
                    guid: 'mock:test-series:s01e01:1080p',
                    isPermaLink: false,
                    pubDate: new Date().toUTCString(),
                    category: 'TV',
                    enclosure: {
                        url: 'http://localhost:3000/api?t=get&id=mock',
                        length: 1000000000,
                        type: 'application/x-nzb',
                    },
                    attributes: {
                        category: '5000',
                        size: 1000000000,
                        season: 1,
                        episode: 1,
                    },
                },
            ],
        };
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
