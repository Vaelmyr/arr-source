import { Injectable, Logger } from '@nestjs/common';
import { BaseProvider } from '../base.provider.js';
import { StreamingCommunityClient } from './streaming-community.client.js';
import type {
    ProviderMedia,
    ProviderMediaIdentity,
    ProviderRelease,
    ProviderTvShow,
} from '../providers.types.js';
import type {
    StreamingCommunityEpisode,
    StreamingCommunitySeason,
    StreamingCommunityShow,
} from './streaming-community.types.js';
import {
    SearchMediaType,
    type SearchRequest,
} from '../../search/search.types.js';

@Injectable()
export class StreamingCommunityProvider extends BaseProvider {
    private readonly logger = new Logger(StreamingCommunityProvider.name);

    readonly id: string = 'streaming-community';
    readonly name: string = 'Streaming Community';

    readonly capabilities = {
        movies: false,
        tvShows: true,
        anime: false,
    };

    constructor(private readonly client: StreamingCommunityClient) {
        super();
    }

    public async search(request: SearchRequest): Promise<ProviderRelease[]> {
        this.logger.debug(
            `Searching on StreamingCommunity for Query=${request.query}, Season=${request.seasonNumber}, Episode=${request.episodeNumber}`,
        );

        const response = await this.client.search(request.query ?? '');

        const media = response.data
            .map((item) => this.mapMedia(item))
            .filter((media): media is ProviderMedia => media !== undefined)
            .filter((media) => this.matches(media, request));

        if (!media) {
            return [];
        }

        if (request.isBrowse) {
            return this.resolveBrowseReleases(media);
        }

        const releases = await Promise.all(
            media.map((item) => this.resolveReleases(item, request)),
        );

        return releases.flat();
    }

    private mapMedia(item: StreamingCommunityShow): ProviderMedia | undefined {
        const identity = {
            id: `${item.id}-${item.slug}`,
            canonicalTitle: item.name,
            aliases: [],
            tmdbId: item.tmdb_id ? Number(item.tmdb_id) : undefined,
            tvdbId: undefined,
            imdbId: undefined,
        };

        switch (item.type) {
            case 'tv':
                return {
                    ...identity,
                    type: 'tv',
                };

            case 'movie':
                return {
                    ...identity,
                    type: 'movie',
                };
        }
    }

    private mapRelease(
        media: ProviderMedia,
        season: StreamingCommunitySeason,
        episode: StreamingCommunityEpisode,
    ): ProviderRelease {
        return {
            id: `${media.id}:${season.number}:${episode.id}`,
            mediaId: media.id,
            providerId: this.id,
            downloadId: `${episode.id}:${episode.scws_id}`,

            type: 'episode',

            title: this.createEpisodeReleaseTitle(
                media,
                season.number,
                Number(episode.number),
            ),

            seasonNumber: season.number,
            episodeNumber: Number(episode.number),

            quality: episode.quality,
            size: episode.size,

            publishedAt: this.getPublishedDate(episode),
        };
    }

    private createEpisodeReleaseTitle(
        show: ProviderMedia,
        seasonNumber: number,
        episodeNumber: number,
    ): string {
        const title = show.canonicalTitle
            .replace(/[^\p{L}\p{N}]+/gu, '.')
            .replace(/^\.+|\.+$/g, '');

        const season = seasonNumber.toString().padStart(2, '0');
        const episode = episodeNumber.toString().padStart(2, '0');

        return `${title}.S${season}E${episode}.StreamingCommunity`;
    }

    private async resolveBrowseReleases(
        media: ProviderMedia[],
    ): Promise<ProviderRelease[]> {
        const show = media.find(
            (item): item is ProviderTvShow => item.type === 'tv',
        );

        if (!show) {
            return [];
        }

        return this.resolveReleases(show, {
            type: SearchMediaType.TV,
            seasonNumber: 1,
            isBrowse: false,
        });
    }

    private async resolveReleases(
        media: ProviderMedia,
        request: SearchRequest,
    ): Promise<ProviderRelease[]> {
        //TODO: Implement movie support
        if (media.type !== 'tv') {
            throw new Error(
                `Unsupported media type: ${media.type}. Only TV shows are currently supported.`,
            );
        }

        this.logger.debug(
            `Resolving releases for TV Show=${media.canonicalTitle}, Season=${request.seasonNumber}, Episode=${request.episodeNumber}`,
        );

        if (request.seasonNumber === undefined) {
            return [];
        }

        const season = await this.client.getSeason(
            media.id,
            request.seasonNumber,
        );

        let episodes = season?.episodes ?? [];

        this.logger.debug(
            `Fetched season episodes for TV Show=${media.canonicalTitle}, Season=${request.seasonNumber}`,
            JSON.stringify(episodes, null, 2),
        );

        if (request.episodeNumber !== undefined) {
            episodes = episodes.filter(
                (episode) => Number(episode.number) === request.episodeNumber,
            );
        }

        return episodes.map((episode) =>
            this.mapRelease(media, season, episode),
        );
    }

    private getPublishedDate(
        episode: StreamingCommunityEpisode,
    ): Date | undefined {
        if (episode.uploaded_at) {
            return new Date(episode.uploaded_at);
        }

        if (episode.updated_at) {
            return new Date(episode.updated_at);
        }

        if (episode.created_at) {
            return new Date(episode.created_at);
        }

        return new Date();
    }

    protected override matchesByTitle(
        media: ProviderMediaIdentity,
        request: SearchRequest,
    ): boolean {
        if (super.matchesByTitle(media, request)) {
            return true;
        }

        return this.matchesByLocalizedSubtitle(media, request);
    }

    private matchesByLocalizedSubtitle(
        media: ProviderMediaIdentity,
        request: SearchRequest,
    ): boolean {
        const normalizedRequestedTitle = this.normalizeTitle(
            request.query ?? '',
        );

        for (const separator of [' - ', ' – ', ' — ']) {
            const index = media.canonicalTitle.indexOf(separator);

            if (index <= 0) {
                continue;
            }

            const baseTitle = media.canonicalTitle.slice(0, index);

            if (this.normalizeTitle(baseTitle) === normalizedRequestedTitle) {
                return true;
            }
        }

        return false;
    }
}
