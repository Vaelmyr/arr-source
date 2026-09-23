import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AutomapperModule } from '@automapper/nestjs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { classes } from '@automapper/classes';
import { NewznabModule } from './newznab/newznab.module.js';
import { envSchema, validateEnv } from './config/configuration.js';
import { SearchModule } from './search/search.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { SabnzbdModule } from './sabnzbd/sabnzbd.module.js';
import { DownloadModule } from './download/download.module.js';

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
        EventEmitterModule.forRoot(),
        NewznabModule,
        SabnzbdModule,
        SearchModule,
        ProvidersModule,
        DownloadModule,
    ],
    controllers: [],
})
export class AppModule {}
