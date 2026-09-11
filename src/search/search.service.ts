import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    NewznabApiType,
    NewznabSearchItem,
    type NewznabSearchQuery,
    type NewznabSearchResponse,
} from '../newznab/newznab.types.js';
import { SEARCH_PROVIDERS } from '../providers/providers.module.js';
import { BaseProvider } from '../providers/base.provider.js';
import { SearchMediaType, type SearchRequest } from './search.types.js';
import { ProviderRelease } from '../providers/providers.types.js';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        @Inject(SEARCH_PROVIDERS)
        private readonly providers: BaseProvider[],
    ) {}

    async search(query: NewznabSearchQuery): Promise<NewznabSearchResponse> {
        const searchRequest = this.toSearchRequest(query);

        const results = await Promise.allSettled(
            this.providers
                .filter((provider) => provider.supports(query.cat))
                .map((provider) => provider.search(searchRequest)),
        );

        const fulfilledPromises = results
            .filter(
                (result): result is PromiseFulfilledResult<ProviderRelease[]> =>
                    result.status === 'fulfilled',
            )
            .flatMap((result) => result.value);

        this.logger.debug(`Search results:`, fulfilledPromises);

        const rejectedPromises = results.filter(
            (result): result is PromiseRejectedResult =>
                result.status === 'rejected',
        );

        if (rejectedPromises.length > 0) {
            this.logger.error(
                `Some providers failed to return results: ${rejectedPromises
                    .map((result) =>
                        result.reason instanceof Error
                            ? result.reason.message
                            : String(result.reason),
                    )
                    .join(', ')}`,
            );
        }

        //TODO: Map properly the results of the providers search to NewznabSearchResponse
        return {
            title: 'Title',
            description: 'Description',
            offset: 0,
            total: fulfilledPromises.length ?? 0,
            items: fulfilledPromises.map(
                (result) =>
                    ({
                        title: result.title,
                        isPermaLink: false,
                        guid: `${result.providerId}:${result.id}`,
                        pubDate: result.publishedAt?.toISOString(),
                        category: result.type,
                        enclosure: {
                            url: `${result.providerId}:${result.id}`,
                            length: result.size,
                            type: 'application/x-nzb',
                        },
                        attributes: {},
                    }) as NewznabSearchItem,
            ),
        };
    }

    private toSearchRequest(query: NewznabSearchQuery): SearchRequest {
        return {
            type: this.getMediaType(query),

            query: query.q ?? query.title,

            seasonNumber: this.parseNumber(query.season),
            episodeNumber: this.parseNumber(query.ep),

            tvdbId: this.parseNumber(query.tvdbid),
            tmdbId: this.parseNumber(query.tmdbid),
            imdbId: query.imdbid,

            isBrowse:
                !query.q &&
                !query.title &&
                !query.tvdbid &&
                !query.tmdbid &&
                !query.imdbid,
        };
    }

    private getMediaType(query: NewznabSearchQuery): SearchMediaType {
        if (
            query.t === NewznabApiType.SEARCH ||
            query.t === NewznabApiType.TV_SEARCH
        ) {
            return SearchMediaType.TV;
        }

        if (query.t === NewznabApiType.MOVIE) {
            return SearchMediaType.MOVIE;
        }

        throw new Error(`Unsupported Newznab search type: ${query.t}`);
    }

    private parseNumber(value: string | undefined): number | undefined {
        if (value === undefined) {
            return undefined;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : undefined;
    }
}
