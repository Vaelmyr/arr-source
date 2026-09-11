import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, map } from 'rxjs';
import * as cheerio from 'cheerio';
import {
    StreamingCommunityEpisode,
    StreamingCommunityLocale,
    StreamingCommunityParsedPage,
    StreamingCommunitySeason,
    type StreamingCommunitySearchResponse,
} from './streaming-community.types.js';

@Injectable()
export class StreamingCommunityClient {
    constructor(private readonly http: HttpService) {}

    public async search(
        query: string,
        locale = StreamingCommunityLocale.IT,
    ): Promise<StreamingCommunitySearchResponse> {
        const { data } = await firstValueFrom(
            this.http.get<StreamingCommunitySearchResponse>(
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

    public async getSeason(
        mediaId: string,
        seasonNumber: number,
        locale = StreamingCommunityLocale.IT,
    ): Promise<StreamingCommunitySeason> {
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

    private parsePage(html: string): StreamingCommunityParsedPage {
        const $ = cheerio.load(html);

        const dataPage = $('[data-page]').first().attr('data-page');

        if (!dataPage) {
            throw new Error(
                'Unable to extract Inertia page data from Streaming Community',
            );
        }

        return JSON.parse(dataPage);
    }
}
