import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, map } from 'rxjs';
import { Expression, parse, Pattern } from 'acorn';
import { simple } from 'acorn-walk';
import * as cheerio from 'cheerio';
import { VixcloudWindowPropertiesDto } from './vixcloud.types.js';
import { Parser as M3U8Parser } from 'm3u8-parser';
import {
    HlsStreamAudioTrackDto,
    HlsStreamDto,
    HlsStreamSubtitleTrackDto,
} from '../extractors.types.js';

@Injectable()
export class VixcloudExtractor {
    private readonly logger = new Logger(VixcloudExtractor.name);

    private readonly BASE_URL = 'https://vixcloud.co';

    constructor(private readonly http: HttpService) {}

    /**
     * Checks if the given URL can be handled by this extractor.
     */
    public canHandle(url: string): boolean {
        return new URL(url).origin === this.BASE_URL;
    }

    /**
     * Fetch the m3u8 master playlist from the given URL, parse
     * it to return the available HLS streams.
     */
    public async extract(url: string): Promise<Array<HlsStreamDto>> {
        this.logger.debug(`Extracting streams from: ${url}`);

        const properties = await firstValueFrom(
            this.http
                .get(url, {
                    headers: {
                        Accept: 'text/html',
                    },
                    responseType: 'text',
                })
                .pipe(map((res) => this.parseWindowProperties(res.data))),
        );

        if (!properties.video?.id) {
            throw new Error('Vixcloud video id was not found');
        }

        if (!properties.masterPlaylist) {
            throw new Error('Vixcloud master playlist was not found');
        }

        const hasB = properties.streams?.some((stream) => {
            return new URL(stream.url).searchParams.has('b');
        });

        const playlistUrl = new URL(properties.masterPlaylist.url);

        if (properties.masterPlaylist.params.token) {
            playlistUrl.searchParams.set(
                'token',
                properties.masterPlaylist.params.token,
            );
        }
        if (properties.masterPlaylist.params.expires) {
            playlistUrl.searchParams.set(
                'expires',
                properties.masterPlaylist.params.expires,
            );
        }

        if (hasB) {
            playlistUrl.searchParams.set('b', '1');
        }

        if (properties.canPlayFHD) {
            playlistUrl.searchParams.set('h', '1');
        }

        //TODO: Add support for other languages, maybe make it configurable
        playlistUrl.searchParams.set('language', 'it');

        return await firstValueFrom(
            this.http
                .get(playlistUrl.toString(), {
                    headers: {
                        Accept: 'application/x-mpegURL',
                    },
                    responseType: 'text',
                })
                .pipe(map((res) => this.parsePlaylist(res.data, playlistUrl))),
        );
    }

    /**
     * Parse the m3u8 playlist source and return the available HLS streams.
     */
    private parsePlaylist(source: string, playlistUrl: URL): HlsStreamDto[] {
        const parser = new M3U8Parser();

        parser.push(source);
        parser.end();

        const manifest = parser.manifest;

        return (manifest.playlists ?? []).map((playlist): HlsStreamDto => {
            const audioGroupId = playlist.attributes.AUDIO;
            const subtitleGroupId = playlist.attributes.SUBTITLES;

            const audioGroup = audioGroupId
                ? manifest.mediaGroups?.AUDIO?.[audioGroupId]
                : undefined;

            const subtitleGroup = subtitleGroupId
                ? manifest.mediaGroups?.SUBTITLES?.[subtitleGroupId]
                : undefined;

            const audioTracks: HlsStreamAudioTrackDto[] = Object.entries(
                audioGroup ?? {},
            )
                .filter(([, track]) => track.uri !== undefined)
                .map(([name, track]) => ({
                    url: new URL(track.uri!, playlistUrl).toString(),
                    name,
                    language: track.language,
                    default: track.default,
                }));

            const subtitleTracks: HlsStreamSubtitleTrackDto[] = Object.entries(
                subtitleGroup ?? {},
            )
                .filter(([, track]) => track.uri !== undefined)
                .map(([name, track]) => ({
                    url: new URL(track.uri!, playlistUrl).toString(),
                    name,
                    language: track.language,
                    default: track.default,
                    forced: track.forced,
                }));

            const resolution = playlist.attributes.RESOLUTION;

            return {
                url: new URL(playlist.uri, playlistUrl).toString(),

                width: resolution?.width,
                height: resolution?.height,
                quality: resolution ? `${resolution.height}p` : undefined,

                bandwidth: playlist.attributes.BANDWIDTH,
                codecs: playlist.attributes.CODECS?.split(','),

                audioTracks,
                subtitleTracks,
            };
        });
    }

    /**
     * Parse the window properties from the given HTML source
     * by parsing the JavaScript code and looking for
     * assignments to the `window` object.
     */
    private parseWindowProperties(html: string): VixcloudWindowPropertiesDto {
        const $ = cheerio.load(html);
        const result: VixcloudWindowPropertiesDto = {};

        $('script:not([src])').each((_, el) => {
            const source = $(el).html();

            if (!source?.includes('window.')) {
                return;
            }

            let ast;
            try {
                ast = parse(source, {
                    ecmaVersion: 'latest',
                    sourceType: 'script',
                });
            } catch {
                return;
            }

            simple(ast, {
                AssignmentExpression: (node) => {
                    const property = this.getWindowProperty(node.left);
                    if (!property) {
                        return;
                    }

                    const value = this.evaluateStatic(node.right);
                    if (value === undefined) {
                        return;
                    }

                    (result as Record<string, unknown>)[property] = value;
                },
            });
        });

        return result;
    }

    /**
     * Get the property name from a `window` member expression,
     * if it is a valid one.
     */
    private getWindowProperty(node: Pattern): string | undefined {
        if (
            node.type !== 'MemberExpression' ||
            node.object.type !== 'Identifier' ||
            node.object.name !== 'window'
        ) {
            return;
        }

        if (!node.computed && node.property.type === 'Identifier') {
            return node.property.name;
        }

        if (
            node.computed &&
            node.property.type === 'Literal' &&
            typeof node.property.value === 'string'
        ) {
            return node.property.value;
        }

        return;
    }

    /**
     * Evaluate a static expression and return its value, if possible.
     * This is used to evaluate the right-hand side of assignments to `window`
     * properties in the JavaScript code.
     */
    private evaluateStatic(node: Expression): unknown {
        switch (node.type) {
            case 'Literal':
                return node.value;

            case 'ObjectExpression':
                return Object.fromEntries(
                    node.properties
                        .filter((property: any) => property.type === 'Property')
                        .map((property: any) => {
                            const key =
                                property.key.type === 'Identifier'
                                    ? property.key.name
                                    : property.key.value;

                            return [key, this.evaluateStatic(property.value)];
                        }),
                );

            case 'ArrayExpression':
                return node.elements.map((element: any) =>
                    element ? this.evaluateStatic(element) : undefined,
                );

            case 'UnaryExpression': {
                const value = this.evaluateStatic(node.argument);

                switch (node.operator) {
                    case '-':
                        return -(value as number);

                    case '+':
                        return +(value as number);

                    case '!':
                        return !value;

                    default:
                        return undefined;
                }
            }

            case 'TemplateLiteral':
                if (node.expressions.length === 0) {
                    return node.quasis[0]?.value.cooked ?? '';
                }

                return undefined;

            default:
                return undefined;
        }
    }
}
