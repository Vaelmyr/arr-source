import { Injectable } from '@nestjs/common';
import { NewznabCapsResponse, NewznabSearchResponse } from './newznab.types.js';
import { create } from 'xmlbuilder2';

@Injectable()
export class NewznabSerializer {
    serializeCaps(response: NewznabCapsResponse) {
        const xml = create({
            version: '1.0',
            encoding: 'UTF-8',
        }).ele('caps');

        xml.ele('server', {
            version: response.server.version,
            title: response.server.title,
        });

        xml.ele('limits', {
            max: response.limits.max,
            default: response.limits.default,
        });

        if (
            response.searching.tvSearch ||
            response.searching.movieSearch ||
            response.searching.search
        ) {
            const searching = xml.ele('searching');

            if (response.searching.search) {
                searching.ele('search', {
                    available: response.searching.search.available,
                    supportedParams: response.searching.search.supportedParams,
                });
            }

            if (response.searching.tvSearch) {
                searching.ele('tv-search', {
                    available: response.searching.tvSearch.available,
                    supportedParams:
                        response.searching.tvSearch.supportedParams,
                });
            }

            if (response.searching.movieSearch) {
                searching.ele('movie-search', {
                    available: response.searching.movieSearch.available,
                    supportedParams:
                        response.searching.movieSearch.supportedParams,
                });
            }
        }

        if (response.categories.length) {
            const categories = xml.ele('categories');

            for (const category of response.categories) {
                const categoryXml = categories.ele('category', {
                    id: category.id,
                    name: category.name,
                });

                if (category.subcat) {
                    categoryXml.ele('subcat', {
                        id: category.subcat.id,
                        name: category.subcat.name,
                    });
                }
            }
        }

        return xml.end({ prettyPrint: true });
    }

    serializeSearch(response: NewznabSearchResponse) {
        const xml = create({
            version: '1.0',
            encoding: 'UTF-8',
        })
            .ele('rss', {
                version: '2.0',
                'xmlns:newznab':
                    'http://www.newznab.com/DTD/2010/feeds/attributes/',
            })
            .ele('channel');

        xml.ele('title').txt(response.title);
        xml.ele('description').txt(response.description);

        xml.ele('newznab:response', {
            offset: response.offset ?? 0,
            total: response.total ?? 0,
        });

        for (const item of response.items ?? []) {
            const itemXml = xml.ele('item');

            itemXml.ele('title').txt(item.title);

            itemXml
                .ele('guid', {
                    isPermaLink: item.isPermaLink,
                })
                .txt(item.guid);

            itemXml.ele('pubDate').txt(new Date(item.pubDate).toUTCString());
            itemXml.ele('category').txt(item.category);

            itemXml.ele('enclosure', {
                url: item.enclosure.url,
                length: item.enclosure.length,
                type: item.enclosure.type,
            });

            for (const [name, value] of Object.entries(item.attributes ?? {})) {
                itemXml.ele('newznab:attr', {
                    name,
                    value: value.toString(),
                });
            }
        }

        return xml.end({ prettyPrint: true });
    }

    serializeGet() {
        const xml = create({
            version: '1.0',
            encoding: 'UTF-8',
        })
            .dtd({
                pubID: '-//newzBin//DTD NZB 1.1//EN',
                sysID: 'http://www.newzbin.com/DTD/nzb/nzb-1.1.dtd',
            })
            .ele('nzb', {
                xmlns: 'http://www.newzbin.com/DTD/2003/nzb',
            });

        return xml.end({ prettyPrint: true });
    }
}
