import { Injectable, Logger } from '@nestjs/common';
import { InjectMapper } from '@automapper/nestjs';
import type { Mapper } from '@automapper/core';
import { BaseProvider } from '../base.provider.js';
import { StreamingCommunityClient } from './streaming-community.client.js';
import { ProviderMediaDto, ProviderReleaseDto } from '../providers.types.js';
import {
    StreamingCommunityMediaDto,
    StreamingCommunityReleaseDto,
    StreamingCommunityDownloadRefDto,
} from './streaming-community.types.js';
import type { SearchRequestDto } from '../../search/search.types.js';
import { VixcloudExtractor } from '../../extractors/vixcloud/vixcloud.extractor.js';

@Injectable()
export class StreamingCommunityProvider extends BaseProvider {
    private readonly logger = new Logger(StreamingCommunityProvider.name);

    readonly id = 'streaming-community';
    readonly name = 'Streaming Community';

    readonly capabilities = {
        movies: false,
        tvShows: true,
        anime: false,
    };

    constructor(
        @InjectMapper() private readonly mapper: Mapper,
        private readonly client: StreamingCommunityClient,
        private readonly vixcloudExtractor: VixcloudExtractor,
    ) {
        super();
    }

    public async search(
        request: SearchRequestDto,
    ): Promise<Array<ProviderReleaseDto<StreamingCommunityDownloadRefDto>>> {
        this.logger.debug(
            `Searching on StreamingCommunity for Query=${request.query}, Season=${request.seasonNumber}, Episode=${request.episodeNumber}`,
        );

        const response = await this.client.search(request.query ?? '');

        // Array of matching media (movies or TV shows) from the search results mapped to ProviderMediaDto
        const media = this.mapper
            .mapArray(
                response.data,
                StreamingCommunityMediaDto,
                ProviderMediaDto,
            )
            .filter((media) => this.matches(media, request));

        this.logger.debug(
            `Found ${media.length} matching media on StreamingCommunity for Query=${request.query}, Season=${request.seasonNumber}, Episode=${request.episodeNumber}`,
        );

        if (!media) {
            return [];
        }

        const releases: StreamingCommunityReleaseDto[] = [];

        for (const item of media) {
            if (item.type === 'tv' && request.seasonNumber !== undefined) {
                const season = await this.client.getSeason(
                    item.id,
                    request.seasonNumber,
                );

                this.logger.debug(
                    `Fetched season details for TV Show=${item.canonicalTitle}, Season=${season.number}`,
                );

                const episodesToFetch = (
                    request.episodeNumber
                        ? [
                              season.episodes.find(
                                  (ep) =>
                                      Number(ep.number) ===
                                      request.episodeNumber,
                              ),
                          ]
                        : season.episodes
                ).filter((episode) => episode !== undefined);

                if (episodesToFetch.length === 0) {
                    this.logger.warn(
                        `No episodes found for TV Show=${item.canonicalTitle}, Season=${season.number}, Episode=${request.episodeNumber}`,
                    );

                    return [];
                }

                for (const episode of episodesToFetch) {
                    const streamingServer =
                        await this.client.getEpisodeVideoServer(
                            item.id,
                            episode.number,
                        );

                    this.logger.debug(
                        `Fetched streaming server for TV Show=${item.canonicalTitle}, Season=${season.number}, Episode=${episode.number}`,
                        streamingServer,
                    );

                    if (!this.vixcloudExtractor.canHandle(streamingServer)) {
                        this.logger.error(
                            `Unsupported streaming server for TV Show=${item.canonicalTitle}, Season=${season.number}, Episode=${episode.number}: ${streamingServer}`,
                        );
                        return [];
                    }

                    const hlsStreams =
                        await this.vixcloudExtractor.extract(streamingServer);

                    this.logger.debug(
                        `Extracted HLS streams for TV Show=${item.canonicalTitle}, Season=${season.number}, Episode=${episode.number}`,
                        JSON.stringify(hlsStreams, null, 2),
                    );

                    for (const stream of hlsStreams) {
                        releases.push({
                            type: 'episode',

                            id: `${item.id}:${season.id}:${episode.id}`,

                            mediaTitle: item.canonicalTitle,
                            episodeTitle:
                                episode.name ??
                                `${season.name}.S${String(season.number).padEnd(2, '0')}E${String(episode.number).padEnd(2, '0')}`,

                            seasonNumber: season.number,
                            episodeNumber: episode.number,

                            quality: stream.quality,

                            publishedAt: new Date(
                                episode.uploaded_at ??
                                    episode.updated_at ??
                                    episode.created_at ??
                                    Date.now(),
                            ),

                            streamUrl: stream.url,
                            audioTracks: stream.audioTracks,
                            subtitleTracks: stream.subtitleTracks,
                        });
                    }
                }
            } else if (item.type === 'movie') {
                //TODO: Fetch movie details and map them to ProviderRelease[]
                this.logger.warn(
                    `Movie support is not yet implemented for StreamingCommunityProvider. Skipping movie: ${item.canonicalTitle}`,
                );
            }
        }

        const output: Array<
            ProviderReleaseDto<StreamingCommunityDownloadRefDto>
        > = this.mapper.mapArray(
            releases,
            StreamingCommunityReleaseDto,
            ProviderReleaseDto,
        );

        this.logger.debug(
            `Mapped ${output.length} releases for Query=${request.query}, Season=${request.seasonNumber}, Episode=${request.episodeNumber}`,
            JSON.stringify(output, null, 2),
        );

        return output;
    }

    protected override matchesByTitle(
        media: ProviderMediaDto,
        request: SearchRequestDto,
    ): boolean {
        if (super.matchesByTitle(media, request)) {
            return true;
        }

        return this.matchesByLocalizedSubtitle(media, request);
    }

    private matchesByLocalizedSubtitle(
        media: ProviderMediaDto,
        request: SearchRequestDto,
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
