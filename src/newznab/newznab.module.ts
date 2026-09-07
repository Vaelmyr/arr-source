import { Module } from '@nestjs/common';
import { NewznabController } from './newznab.controller.js';
import { NewznabService } from './newznab.service.js';
import { NewznabSerializer } from './newznab.serializer.js';

@Module({
    controllers: [NewznabController],
    providers: [NewznabService, NewznabSerializer],
})
export class NewznabModule {}
