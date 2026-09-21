import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, map } from 'rxjs';
import * as cheerio from 'cheerio';
import {
    StreamingCommunityLocale,
    StreamingCommunitySearchResponseDto,
    StreamingCommunityPageJsonDto,
    StreamingCommunitySeasonDto,
} from './streaming-community.types.js';

@Injectable()
export class StreamingCommunityClient {
    constructor(private readonly http: HttpService) {}

    public async search(
        query: string,
        locale = StreamingCommunityLocale.IT,
    ): Promise<StreamingCommunitySearchResponseDto> {
        const { data } = await firstValueFrom(
            this.http.get<StreamingCommunitySearchResponseDto>(
                `/${locale}/search`,
                {
                    params: {
                        q: query,
                        page: 1,
                        lang: locale,
                    },
                },
            ),
        );

        return data;
    }

    //TODO: Try to use `Content-Type: application/json` instead of parsing the HTML page
    public async getSeason(
        mediaId: string,
        seasonNumber: number,
        locale = StreamingCommunityLocale.IT,
    ): Promise<StreamingCommunitySeasonDto> {
        const parsedPage = await firstValueFrom(
            this.http
                .get<string>(
                    `/${locale}/titles/${mediaId}/season-${seasonNumber}`,
                    {
                        headers: {
                            Accept: 'text/html',
                        },
                        responseType: 'text',
                    },
                )
                .pipe(map((html) => this.parsePage(html.data))),
        );

        return parsedPage.props.loadedSeason;
    }

    public async getEpisodeVideoServer(
        titleId: string,
        episodeId: number | string,
        locale = StreamingCommunityLocale.IT,
    ): Promise<string> {
        const iframeSrc = await firstValueFrom(
            this.http
                .get(
                    `/${locale}/iframe/${titleId}?episode_id=${episodeId}&language=${locale}&next_episode=1`,
                    {
                        headers: {
                            Accept: 'text/html',
                        },
                        responseType: 'text',
                    },
                )
                .pipe(map((html) => this.parseIframe(html.data))),
        );

        return iframeSrc;
    }

    private parsePage(html: string): StreamingCommunityPageJsonDto {
        const $ = cheerio.load(html);

        const dataPage = $('[data-page]').first().attr('data-page');

        if (!dataPage) {
            throw new Error(
                'Unable to extract Inertia page data from Streaming Community',
            );
        }

        return JSON.parse(dataPage);
    }

    private parseIframe(html: string): string {
        const $ = cheerio.load(html);

        const iframeSrc = $('iframe').first().attr('src');

        if (!iframeSrc) {
            throw new Error(
                'Unable to extract iframe src from Streaming Community',
            );
        }

        return iframeSrc;
    }
}
