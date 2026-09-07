import {
    Controller,
    Get,
    Logger,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { NewznabService } from './newznab.service.js';
import type { NewznabApiQuery } from './newznab.types.js';
import { NewznabApiType } from './newznab.types.js';
import { NewznabApiGuard } from './newznab-api.guard.js';
import { NewznabTypeInterceptor } from './newznab-type.interceptor.js';
import { omit } from 'es-toolkit/object';

@Controller('newznab')
@UseGuards(NewznabApiGuard)
@UseInterceptors(NewznabTypeInterceptor)
export class NewznabController {
    private readonly logger = new Logger(NewznabController.name);

    constructor(private readonly newznabService: NewznabService) {}

    /**
     * NEWZNAB Usenet Searching Web API
     * @see https://newznab.readthedocs.io/en/latest/misc/api.html
     */
    @Get('api')
    async handleApi(@Query() query: NewznabApiQuery): Promise<any> {
        query = omit(query, ['apikey']) as NewznabApiQuery;

        this.logger.debug(`Received API request: ${JSON.stringify(query)}`);

        switch (query.t) {
            case NewznabApiType.CAPS:
                return this.newznabService.caps();
            case NewznabApiType.SEARCH:
            case NewznabApiType.TV_SEARCH:
            case NewznabApiType.MOVIE:
                return this.newznabService.search(query);
            case NewznabApiType.GET:
                return this.newznabService.get();
        }
    }
}
