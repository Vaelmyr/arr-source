import { Module } from '@nestjs/common';
import { SabnzbdController } from './sabnzbd.controller.js';
import { SabnzbdService } from './sabnzbd.service.js';
import { PrismaService } from '../prisma.service.js';
import { SabnzbdMapper } from './sabnzbd.mapper.js';

@Module({
    controllers: [SabnzbdController],
    providers: [PrismaService, SabnzbdService, SabnzbdMapper],
})
export class SabnzbdModule {}
