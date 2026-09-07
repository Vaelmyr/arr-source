import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { NewznabApiQuery, NewznabApiType } from './newznab.types.js';
import { ConfigService } from '@nestjs/config';

/**
 * Guard to validate Newznab API requests.
 * It checks for the presence of the `apikey` query parameter for search requests
 * and validates it against the expected API key.
 *
 * If the `apikey` is missing or invalid, it throws a `BadRequestException`.
 */
@Injectable()
export class NewznabApiGuard implements CanActivate {
    constructor(private readonly config: ConfigService) {}

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const query = request.query as NewznabApiQuery;

        const requiresApiKey =
            query.t === NewznabApiType.SEARCH ||
            query.t === NewznabApiType.TV_SEARCH ||
            query.t === NewznabApiType.MOVIE ||
            query.t === NewznabApiType.GET;

        if (requiresApiKey && !query.apikey) {
            throw new BadRequestException(
                'Missing required query parameter: apikey',
            );
        }

        if (
            query.apikey &&
            query.apikey !== this.config.get<string>('API_KEY')
        ) {
            throw new BadRequestException('Invalid API key');
        }

        return true;
    }
}
