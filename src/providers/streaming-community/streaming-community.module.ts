import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { StreamingCommunityClient } from './streaming-community.client.js';
import { StreamingCommunityProvider } from './streaming-community.provider.js';
import { StreamingCommunityMapper } from './streaming-community.mapper.js';
import { VixcloudModule } from '../../extractors/vixcloud/vixcloud.module.js';

@Module({
    imports: [
        HttpModule.register({
            baseURL: 'https://streamingcommunityz.taxi',
            timeout: 30_000,
        }),
        VixcloudModule,
    ],
    providers: [
        StreamingCommunityClient,
        StreamingCommunityProvider,
        StreamingCommunityMapper,
    ],
    exports: [StreamingCommunityProvider],
})
export class StreamingCommunityModule {}
