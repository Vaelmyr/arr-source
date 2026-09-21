import {
    Controller,
    Get,
    Logger,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import {
    SabnzbdAddFileResponseDto,
    SabnzbdApiMode,
    SabnzbdGetConfigResponseDto,
    SabnzbdVersionResponseDto,
    type SabnzbdApiQuery,
} from './sabnzbd.types.js';
import { SabnzbdService } from './sabnzbd.service.js';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('sabnzbd')
export class SabnzbdController {
    private readonly logger = new Logger(SabnzbdController.name);

    constructor(private readonly sabnzbdService: SabnzbdService) {}

    /**
     * SABnzbd Usenet Download API
     * @see https://sabnzbd.org/wiki/configuration/5.1/api
     */
    @Get('api')
    async handleGetApi(
        @Query() query: SabnzbdApiQuery,
    ): Promise<SabnzbdVersionResponseDto | SabnzbdGetConfigResponseDto> {
        this.logger.debug(`Received GET API request: ${JSON.stringify(query)}`);

        switch (query.mode) {
            case SabnzbdApiMode.VERSION:
                return this.sabnzbdService.version();
            case SabnzbdApiMode.GET_CONFIG:
                return this.sabnzbdService.getConfig();
            default:
                throw new Error(`Unsupported SABnzbd API mode: ${query.mode}`);
        }
    }

    /**
     * SABnzbd Usenet Download API
     * @see https://sabnzbd.org/wiki/configuration/5.1/api
     */
    @Post('api')
    @UseInterceptors(FileInterceptor('name'))
    async handlePostApi(
        @Query() query: SabnzbdApiQuery,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<SabnzbdAddFileResponseDto> {
        this.logger.debug(
            `Received POST API request: ${JSON.stringify(query)}`,
            file,
        );

        switch (query.mode) {
            case SabnzbdApiMode.ADD_FILE:
                return this.sabnzbdService.addFile(query, file);
            default:
                throw new Error(`Unsupported SABnzbd API mode: ${query.mode}`);
        }
    }
}
