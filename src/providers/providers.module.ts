import { Module, Type } from '@nestjs/common';
import { BaseProvider } from './base.provider.js';
import { StreamingCommunityProvider } from './streaming-community/streaming-community.provider.js';
import { StreamingCommunityModule } from './streaming-community/streaming-community.module.js';

export const SEARCH_PROVIDERS = Symbol('SEARCH_PROVIDERS');

const AVAILABLE_PROVIDERS: Type<BaseProvider>[] = [StreamingCommunityProvider];

@Module({
    imports: [StreamingCommunityModule],
    providers: [
        {
            provide: SEARCH_PROVIDERS,
            useFactory: (...providers) => providers,
            inject: AVAILABLE_PROVIDERS,
        },
    ],
    exports: [SEARCH_PROVIDERS],
})
export class ProvidersModule {}
