import { inRange } from 'es-toolkit/math';
import {
    type SearchDbIdentity,
    type SearchRequest,
} from '../search/search.types.js';
import type {
    ProviderMediaIdentity,
    ProviderRelease,
} from './providers.types.js';

const MIN_TITLE_LENGTH_FOR_SINGLE_EDIT_MATCH = 12;

export abstract class BaseProvider {
    public abstract readonly id: string;
    public abstract readonly name: string;

    /**
     * The capabilities of the provider, used to determine if the provider supports a given category.
     *
     * @see {@link supports} for more information on how capabilities are used.
     */
    public abstract readonly capabilities: {
        movies: boolean;
        tvShows: boolean;
        anime: boolean;
    };

    /**
     * Search for media releases based on the given request.
     *
     * @param request The search request containing the query and optional identifiers.
     * @returns A promise that resolves to an array of matching releases.
     * @throws An error if the search fails.
     */
    public abstract search(request: SearchRequest): Promise<ProviderRelease[]>;

    /**
     * Check if the provider supports the given categories.
     *
     * @param categoryString A comma-separated string of category IDs.
     * @returns `true` if the provider supports at least one of the categories, `false` otherwise.
     */
    public supports(categoryString?: string): boolean {
        const categories = categoryString?.split(',').map(Number) ?? [];

        if (categories.length === 0) {
            return false;
        }

        return categories.some((category) => {
            if (category === 5070) {
                return this.capabilities.anime;
            }

            if (inRange(category, 5000, 6000)) {
                return this.capabilities.tvShows;
            }

            if (inRange(category, 2000, 3000)) {
                return this.capabilities.movies;
            }

            return false;
        });
    }

    /**
     * Check if the given media matches the search request.
     * However, if the search request is in "browse" mode, it will always return `true`, indicating that all media should be considered a match.
     *
     * @param media The media to check.
     * @param request The search request to match against.
     * @returns `true` if the media matches the search request, `false` otherwise.
     */
    protected matches(
        media: ProviderMediaIdentity,
        request: SearchRequest,
    ): boolean {
        if (request.isBrowse) {
            return true;
        }

        for (const idKey of ['imdbId', 'tmdbId', 'tvdbId'] as const) {
            const match = this.matchesByMediaDbId(media, request, idKey);

            if (match !== undefined) {
                return match;
            }
        }

        return this.matchesByTitle(media, request);
    }

    /**
     * Check if the given media matches the search request based on a specific database ID.
     *
     * @param media The media to check.
     * @param request The search request to match against.
     * @param idKey The key of the database ID to check (e.g., 'imdbId', 'tmdbId', 'tvdbId').
     * @returns `true` if the media matches the search request based on the specified database ID, `false` if it does not match, or `undefined` if either ID is not present.
     */
    protected matchesByMediaDbId(
        media: ProviderMediaIdentity,
        request: SearchRequest,
        idKey: keyof SearchDbIdentity,
    ): boolean | undefined {
        const mediaId = media[idKey];
        const requestedId = request[idKey];

        if (requestedId !== undefined && mediaId !== undefined) {
            return requestedId === mediaId;
        }

        return undefined;
    }

    /**
     * Check if the given media matches the search request based on title and aliases.
     *
     * @param media The media to check.
     * @param request The search request to match against.
     * @returns `true` if the media matches the search request based on title or aliases, `false` otherwise.
     */
    protected matchesByTitle(
        media: ProviderMediaIdentity,
        request: SearchRequest,
    ): boolean {
        if (!request.query?.trim()) {
            return false;
        }

        const query = request.query.trim();
        const normalizedQuery = this.normalizeTitle(query);
        const titles = [media.canonicalTitle, ...media.aliases];

        if (
            titles.some(
                (title) => this.normalizeTitle(title) === normalizedQuery,
            )
        ) {
            return true;
        }

        return titles.some((title) => this.matchesWithSingleEdit(title, query));
    }

    /**
     * Normalize a title by removing diacritics, non-alphanumeric characters, and converting to lowercase.
     *
     * @param value The title to normalize.
     * @returns The normalized title.
     */
    protected normalizeTitle(value: string): string {
        return value
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .replace(/[^\p{L}\p{N}]/gu, '')
            .toLowerCase();
    }

    /**
     * Check if two titles match with at most a single edit (insertion, deletion, or substitution).
     * This applies to titles that are at least 12 characters long and have the same numeric tokens.
     *
     * @param title The first title to compare.
     * @param query The second title to compare.
     * @returns `true` if the titles match with at most a single edit, `false` otherwise.
     */
    protected matchesWithSingleEdit(title: string, query: string): boolean {
        const candidate = this.normalizeTitle(title);
        const target = this.normalizeTitle(query);

        if (
            Math.min(candidate.length, target.length) <
            MIN_TITLE_LENGTH_FOR_SINGLE_EDIT_MATCH
        ) {
            return false;
        }

        if (Math.abs(candidate.length - target.length) > 1) {
            return false;
        }

        if (
            this.extractNumericTokens(title) !==
            this.extractNumericTokens(query)
        ) {
            return false;
        }

        let i = 0;
        let j = 0;
        let edits = 0;

        while (i < candidate.length && j < target.length) {
            if (candidate[i] === target[j]) {
                i++;
                j++;
                continue;
            }

            if (++edits > 1) {
                return false;
            }

            if (candidate.length >= target.length) {
                i++;
            }

            if (target.length >= candidate.length) {
                j++;
            }
        }

        return edits + candidate.length - i + target.length - j <= 1;
    }

    /**
     * Extract numeric tokens from a string and return them as a comma-separated string.
     *
     * @param value The string to extract numeric tokens from.
     * @returns A comma-separated string of numeric tokens.
     */
    private extractNumericTokens(value: string): string {
        return [...value.matchAll(/\d+/g)].map((match) => match[0]).join(',');
    }
}
