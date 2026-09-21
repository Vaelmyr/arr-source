import { Module } from '@nestjs/common';
import { VixcloudExtractor } from './vixcloud.extractor.js';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    providers: [VixcloudExtractor],
    exports: [VixcloudExtractor],
})
export class VixcloudModule {}
