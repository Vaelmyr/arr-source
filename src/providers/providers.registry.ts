import { Inject, Injectable } from '@nestjs/common';
import { SEARCH_PROVIDERS } from './providers.types.js';
import { BaseProvider } from './base.provider.js';

@Injectable()
export class ProvidersRegistry {
    private readonly providersMap: Map<string, BaseProvider> = new Map();

    constructor(
        @Inject(SEARCH_PROVIDERS) private readonly providers: BaseProvider[],
    ) {
        for (const provider of this.providers) {
            this.providersMap.set(provider.id, provider);
        }
    }

    /**
     * Returns the provider instance for the given provider ID.
     */
    public get(providerId: string): BaseProvider | undefined {
        if (!this.providersMap.has(providerId)) {
            throw new Error(`Provider with ID '${providerId}' not found.`);
        }

        return this.providersMap.get(providerId);
    }
}
