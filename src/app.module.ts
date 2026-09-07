import { Module } from '@nestjs/common';
import { NewznabModule } from './newznab/newznab.module.js';
import { ConfigModule } from '@nestjs/config';
import { envSchema, validateEnv } from './config/configuration.js';

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
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
