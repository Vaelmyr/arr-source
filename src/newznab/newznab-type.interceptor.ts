import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    NotAcceptableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { NewznabSerializer } from './newznab.serializer.js';
import { Request, Response } from 'express';
import { NewznabApiQuery, NewznabApiType } from './newznab.types.js';

/**
 * Interceptor that handles the serialization of Newznab API responses
 * based on the request type defined by the query parameter `o: xml | json`.
 *
 * If the type is `json`, it throws an `UnprocessableEntityException` since JSON output is not supported.
 *
 * If the request type specified by the query parameter `t` is invalid, it throws a `NotAcceptableException`.
 */
@Injectable()
export class NewznabTypeInterceptor implements NestInterceptor {
    constructor(private readonly serializer: NewznabSerializer) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
    ): Observable<any> | Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const query = request.query as NewznabApiQuery;

        if (query.o === 'json') {
            throw new UnprocessableEntityException(
                'JSON output is not supported, use `o=xml` instead.',
            );
        }

        switch (query.t) {
            case NewznabApiType.CAPS:
                response.type('application/xml');
                break;

            case NewznabApiType.SEARCH:
            case NewznabApiType.TV_SEARCH:
            case NewznabApiType.MOVIE:
                response.type('application/rss+xml');
                break;

            case NewznabApiType.GET:
                response.type('application/x-nzb');
                break;
        }

        return next.handle().pipe(
            map((body) => {
                switch (query.t) {
                    case NewznabApiType.CAPS:
                        return this.serializer.serializeCaps(body);

                    case NewznabApiType.SEARCH:
                    case NewznabApiType.TV_SEARCH:
                    case NewznabApiType.MOVIE:
                        return this.serializer.serializeSearch(body);

                    case NewznabApiType.GET:
                        return this.serializer.serializeGet();

                    default:
                        throw new NotAcceptableException(
                            `Invalid request type. Supported types are: ${Object.values(NewznabApiType).join(', ')}.`,
                        );
                }
            }),
        );
    }
}
