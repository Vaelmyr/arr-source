import { Module } from '@nestjs/common';
import { SabnzbdController } from './sabnzbd.controller.js';
import { SabnzbdService } from './sabnzbd.service.js';

@Module({
    controllers: [SabnzbdController],
    providers: [SabnzbdService],
})
export class SabnzbdModule {}
