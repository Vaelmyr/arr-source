import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AutomapperModule } from '@automapper/nestjs';
import { classes } from '@automapper/classes';
import { NewznabModule } from './newznab/newznab.module.js';
import { envSchema, validateEnv } from './config/configuration.js';
import { SearchModule } from './search/search.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { SabnzbdModule } from './sabnzbd/sabnzbd.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: envSchema,
            expandVariables: true,
            validate: validateEnv,
            cache: true,
            isGlobal: true,
        }),
        AutomapperModule.forRoot({
            strategyInitializer: classes(),
        }),
        NewznabModule,
        SabnzbdModule,
        SearchModule,
        ProvidersModule,
    ],
    controllers: [],
})
export class AppModule {}
