import { Module } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
    providers: [SearchService],
    exports: [SearchService],
    imports: [ProvidersModule],
})
export class SearchModule {}
