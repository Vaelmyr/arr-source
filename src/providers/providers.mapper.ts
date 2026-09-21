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
import { ProviderReleaseDto } from './providers.types.js';
import {
    NewznabItemAttributeDto,
    NewznabSearchItemDto,
} from '../newznab/newznab.types.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProvidersMapper extends AutomapperProfile {
    constructor(
        @InjectMapper() readonly mapper: Mapper,
        private readonly config: ConfigService,
    ) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            // ProviderReleaseDto -> NewznabSearchItemDto
            //TODO: Handle the `category` mapping with human-readable category names if possible.
            createMap(
                mapper,
                ProviderReleaseDto,
                NewznabSearchItemDto,
                forMember(
                    (d) => d.title,
                    mapFrom((s) => this.buildSonarrReleaseTitle(s)),
                ),
                forMember(
                    (d) => d.guid,
                    mapFrom((s) => s.id),
                ),
                forMember((d) => d.isPermaLink, fromValue(false)),
                forMember(
                    (d) => d.pubDate,
                    mapFrom((s) => s.publishedAt?.toISOString() ?? ''),
                ),
                forMember((d) => d.category, fromValue(undefined)),
                forMember(
                    (d) => d.enclosure,
                    mapFrom((s) => ({
                        url: this.buildDownloadUrl(s),
                        length: 0,
                        type: 'application/x-nzb',
                    })),
                ),
                forMember(
                    (d) => d.attributes,
                    mapFrom((s) => this.buildAttributes(s)),
                ),
            );
        };
    }

    //TODO: Test and properly implement the `APP_BASE_URL` variable to build properly the download URL for the NZB file.
    private buildDownloadUrl(release: ProviderReleaseDto): string {
        const url = new URL(
            '/api',
            this.config.get<string>('APP_BASE_URL', 'http://localhost:3000'),
        );

        url.searchParams.set('t', 'get');
        url.searchParams.set('id', release.id);

        return url.toString();
    }

    private buildSonarrReleaseTitle(release: ProviderReleaseDto): string {
        const title = this.normalizeReleaseTitle(release.title);

        const season = String(release.seasonNumber).padStart(2, '0');
        const episode = String(release.episodeNumber).padStart(2, '0');

        return [
            title,
            `S${season}E${episode}`,
            release.quality,
            'WEB-DL',
            release.providerId,
        ].join('.');
    }

    private normalizeReleaseTitle(value: string): string {
        return value
            .trim()
            .replace(/[^\p{L}\p{N}]+/gu, '.')
            .replace(/^\.+|\.+$/g, '');
    }

    //TODO: Properly implement the method to support other types of releases if possible (e.g. movies)
    private getCategories(release: ProviderReleaseDto): number[] {
        const categories = [5010];

        switch (release.quality) {
            case '480p':
                categories.push(5030);
                break;

            case '720p':
            case '1080p':
                categories.push(5040);
                break;

            case '2160p':
                categories.push(5045);
                break;
        }

        return categories;
    }

    private buildAttributes(
        release: ProviderReleaseDto,
    ): NewznabItemAttributeDto[] {
        const attributes: NewznabItemAttributeDto[] = [];

        for (const category of this.getCategories(release)) {
            attributes.push({
                name: 'category',
                value: category,
            });
        }

        for (const language of release.audioLanguages) {
            attributes.push({
                name: 'language',
                value: language,
            });
        }

        if (release.subtitleLanguages.length > 0) {
            attributes.push({
                name: 'subs',
                value: release.subtitleLanguages.join(', '),
            });
        }

        if (release.tvdbId !== undefined) {
            attributes.push({
                name: 'tvdbid',
                value: release.tvdbId,
            });
        }

        if (release.imdbId !== undefined) {
            attributes.push({
                name: 'imdb',
                value: release.imdbId.replace(/^tt/, ''),
            });
        }

        if (release.size !== undefined) {
            attributes.push({
                name: 'size',
                value: release.size,
            });
        }

        return attributes;
    }
}
