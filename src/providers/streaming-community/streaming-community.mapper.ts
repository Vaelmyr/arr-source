import {
    createMap,
    forMember,
    fromValue,
    mapFrom,
    type Mapper,
    type MappingProfile,
} from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import {
    StreamingCommunityDownloadRefDto,
    StreamingCommunityMediaDto,
    StreamingCommunityReleaseDto,
} from './streaming-community.types.js';
import { ProviderMediaDto, ProviderReleaseDto } from '../providers.types.js';

@Injectable()
export class StreamingCommunityMapper extends AutomapperProfile {
    constructor(@InjectMapper() readonly mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            // StreamingCommunityBaseMediaDto -> ProviderBaseMediaDto
            //TODO: Add support for `aliases`, `tvdbId` and `imdbId` if possible
            createMap(
                mapper,
                StreamingCommunityMediaDto,
                ProviderMediaDto,
                forMember(
                    (d) => d.type,
                    mapFrom((s) => s.type),
                ),
                forMember(
                    (d) => d.id,
                    mapFrom((s) => `${s.id}-${s.slug}`),
                ),
                forMember(
                    (d) => d.canonicalTitle,
                    mapFrom((s) => s.name),
                ),
                forMember((d) => d.aliases, fromValue([])),
                forMember(
                    (d) => d.tmdbId,
                    mapFrom((s) => (s.tmdb_id ? Number(s.tmdb_id) : undefined)),
                ),
                forMember((d) => d.tvdbId, fromValue(undefined)),
                forMember((d) => d.imdbId, fromValue(undefined)),
            );

            // StreamingCommunityReleaseDto -> ProviderReleaseDto
            //TODO: Handle `downloadRef` mapping for other types of releases (e.g. movies)
            createMap(
                mapper,
                StreamingCommunityReleaseDto,
                ProviderReleaseDto,
                forMember(
                    (d) => d.providerId,
                    fromValue('streaming-community'),
                ),
                forMember(
                    (d) => d.id,
                    mapFrom((s) => `${s.id}:${s.quality}`),
                ),
                forMember(
                    (d) => d.title,
                    mapFrom((s) => s.mediaTitle),
                ),
                forMember(
                    (d) => d.episodeTitle,
                    mapFrom((s) => s.episodeTitle),
                ),
                forMember(
                    (d) => d.seasonNumber,
                    mapFrom((s) => s.seasonNumber),
                ),
                forMember(
                    (d) => d.episodeNumber,
                    mapFrom((s) => s.episodeNumber),
                ),
                forMember(
                    (d) => d.quality,
                    mapFrom((s) => s.quality),
                ),
                forMember(
                    (d) => d.publishedAt,
                    mapFrom((s) => s.publishedAt),
                ),
                forMember(
                    (d) => d.audioLanguages,
                    mapFrom(
                        (s) =>
                            s.audioTracks?.map((t) => t.name ?? t.language) ??
                            [],
                    ),
                ),
                forMember(
                    (d) => d.subtitleLanguages,
                    mapFrom(
                        (s) =>
                            s.subtitleTracks?.map(
                                (t) => t.name ?? t.language,
                            ) ?? [],
                    ),
                ),
                forMember(
                    (d) => d.downloadRef,
                    mapFrom(
                        (s) =>
                            ({
                                providerId: 'streaming-community',
                                itemId: `${s.id}:${s.quality}`,

                                data: {
                                    type: 'episode',
                                    id: s.id,
                                    episodeNumber: s.episodeNumber,
                                    quality: s.quality,
                                },
                            }) as StreamingCommunityDownloadRefDto,
                    ),
                ),
            );
        };
    }
}
