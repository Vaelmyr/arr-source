import { Module } from '@nestjs/common';
import { NewznabModule } from './newznab/newznab.module.js';
import { ConfigModule } from '@nestjs/config';
import { envSchema, validateEnv } from './config/configuration.js';
import { SearchModule } from './search/search.module.js';
import { ProvidersModule } from './providers/providers.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: envSchema,
            expandVariables: true,
            validate: validateEnv,
            cache: true,
            isGlobal: true,
        }),
        NewznabModule,
        SearchModule,
        ProvidersModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
