import { Module } from '@nestjs/common';
import { NewznabController } from './newznab.controller.js';
import { NewznabService } from './newznab.service.js';
import { NewznabSerializer } from './newznab.serializer.js';
import { SearchModule } from '../search/search.module.js';

@Module({
    controllers: [NewznabController],
    providers: [NewznabService, NewznabSerializer],
    imports: [SearchModule],
})
export class NewznabModule {}
