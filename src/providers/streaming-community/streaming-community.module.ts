import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { StreamingCommunityClient } from './streaming-community.client.js';
import { StreamingCommunityProvider } from './streaming-community.provider.js';

@Module({
    imports: [
        HttpModule.register({
            baseURL: 'https://streamingcommunityz.taxi',
            timeout: 30_000,
        }),
    ],
    providers: [StreamingCommunityClient, StreamingCommunityProvider],
    exports: [StreamingCommunityProvider],
})
export class StreamingCommunityModule {}
