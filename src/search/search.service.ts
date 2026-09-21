import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import {
    NewznabApiType,
    NewznabSearchItemDto,
    type NewznabSearchQueryDto,
    type NewznabSearchResponseDto,
} from '../newznab/newznab.types.js';
import { SEARCH_PROVIDERS } from '../providers/providers.module.js';
import { BaseProvider } from '../providers/base.provider.js';
import { SearchMediaType, type SearchRequestDto } from './search.types.js';
import { ProviderReleaseDto } from '../providers/providers.types.js';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        @Inject(SEARCH_PROVIDERS) private readonly providers: BaseProvider[],
        @InjectMapper() private readonly mapper: Mapper,
    ) {}

    async search(
        query: NewznabSearchQueryDto,
    ): Promise<NewznabSearchResponseDto> {
        let searchRequest = this.toSearchRequest(query);

        //TODO: Implement a proper browse search handling mechanism to support the `isBrowse` flag in the search request.
        if (searchRequest.isBrowse) {
            this.logger.debug(
                `Browse search detected. Overriding query to 'Rick and Morty' with Season=1 and Episode=1`,
            );

            searchRequest = {
                ...searchRequest,
                query: 'Rick and Morty',
                seasonNumber: 1,
                episodeNumber: 1,
            };
        }

        const results = await Promise.allSettled(
            this.providers
                .filter((provider) => provider.supports(query.cat))
                .map((provider) => provider.search(searchRequest)),
        );

        const fulfilledPromises = results
            .filter(
                (
                    result,
                ): result is PromiseFulfilledResult<ProviderReleaseDto[]> =>
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

        const items = this.mapper.mapArray(
            fulfilledPromises,
            ProviderReleaseDto,
            NewznabSearchItemDto,
        );

        this.logger.debug(
            `Mapped search results to NewznabSearchItemDto:`,
            JSON.stringify(items, null, 2),
        );

        //TODO: Implement correct `title` and `description` values for the NewznabSearchResponse based on the search query and results.
        return {
            title: 'Title',
            description: 'Description',
            offset: 0,
            total: items.length ?? 0,
            items,
        };
    }

    private toSearchRequest(query: NewznabSearchQueryDto): SearchRequestDto {
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

    private getMediaType(query: NewznabSearchQueryDto): SearchMediaType {
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
