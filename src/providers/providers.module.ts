import { Module, Type } from '@nestjs/common';
import { BaseProvider } from './base.provider.js';
import { StreamingCommunityProvider } from './streaming-community/streaming-community.provider.js';
import { StreamingCommunityModule } from './streaming-community/streaming-community.module.js';
import { ProvidersMapper } from './providers.mapper.js';
import { ProvidersRegistry } from './providers.registry.js';
import { SEARCH_PROVIDERS } from './providers.types.js';

const AVAILABLE_PROVIDERS: Type<BaseProvider>[] = [StreamingCommunityProvider];

@Module({
    imports: [StreamingCommunityModule],
    providers: [
        {
            provide: SEARCH_PROVIDERS,
            useFactory: (...providers) => providers,
            inject: AVAILABLE_PROVIDERS,
        },
        ProvidersMapper,
        ProvidersRegistry,
    ],
    exports: [SEARCH_PROVIDERS, ProvidersRegistry],
})
export class ProvidersModule {}
