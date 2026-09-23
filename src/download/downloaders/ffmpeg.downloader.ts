import { Injectable, Logger } from '@nestjs/common';
import { HlsStreamDto } from '../../extractors/extractors.types.js';
import {
    DownloadOptionsDto,
    DownloadProgressDto,
    DownloadResultDto,
} from '../download.types.js';
import { stat } from 'fs/promises';
import { spawn } from 'child_process';

@Injectable()
export class FfmpegDownloader {
    private readonly logger = new Logger(FfmpegDownloader.name);

    /**
     * Start a download of the given HLS stream using ffmpeg.
     */
    async download(
        source: HlsStreamDto,
        options: DownloadOptionsDto,
    ): Promise<DownloadResultDto> {
        const args = this.buildArgs(source, options.outputPath);

        this.logger.debug(`Starting ffmpeg: ffmpeg ${args.join(' ')}`);

        await this.execute(args, options.onProgress);
        const outputStat = await stat(options.outputPath);

        return {
            outputPath: options.outputPath,
            totalBytes: BigInt(outputStat.size),
        };
    }

    /**
     * Spawn a child process to run ffmpeg with the given arguments and report progress.
     */
    private execute(
        args: string[],
        onProgress?: (progress: DownloadProgressDto) => void,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const process = spawn('ffmpeg', args, {
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let progressBuffer = '';
            let stderr = '';

            process.stdout.setEncoding('utf8');

            process.stdout.on('data', (chunk: string) => {
                progressBuffer += chunk;

                const lines = progressBuffer.split('\n');

                progressBuffer = lines.pop() ?? '';

                for (const line of lines) {
                    this.handleProgressLine(line.trim(), onProgress);
                }
            });

            process.stderr.setEncoding('utf8');

            process.stderr.on('data', (chunk: string) => {
                stderr += chunk;

                if (stderr.length > 64_000) {
                    stderr = stderr.slice(-64_000);
                }
            });

            process.once('error', reject);

            process.once('close', (code, signal) => {
                if (code === 0) {
                    resolve();
                    return;
                }

                reject(
                    new Error(
                        `ffmpeg exited with code ${code}` +
                            (signal ? ` (${signal})` : '') +
                            (stderr ? `\n${stderr.trim()}` : ''),
                    ),
                );
            });
        });
    }

    private handleProgressLine(
        line: string,
        onProgress?: (progress: DownloadProgressDto) => void,
    ): void {
        const progressState = new Map<string, string>();

        if (!line) {
            return;
        }

        const separator = line.indexOf('=');

        if (separator === -1) {
            return;
        }

        const key = line.slice(0, separator);
        const value = line.slice(separator + 1);

        progressState.set(key, value);
        if (key !== 'progress') {
            return;
        }

        const totalSize = BigInt(progressState.get('total_size') ?? '0');
        const outTimeUs = Number(progressState.get('out_time_us') ?? '0');
        const rawSpeed = progressState.get('speed');

        const speed = rawSpeed
            ? Number.parseFloat(rawSpeed.replace('x', ''))
            : undefined;

        onProgress?.({
            outputBytes: totalSize,
            outTimeSeconds: Number.isFinite(outTimeUs)
                ? outTimeUs / 1_000_000
                : 0,
            speed: Number.isFinite(speed) ? speed : undefined,
        });
    }

    private buildArgs(source: HlsStreamDto, outputPath: string): string[] {
        const args: string[] = [
            '-hide_banner',
            '-loglevel',
            'warning',

            '-nostdin',
            '-y',

            '-progress',
            'pipe:1',

            '-stats_period',
            '1',
        ];

        // Input 0: main HLS stream
        this.addHlsInput(args, source.url);

        // Input 1..N: external audio streams
        for (const audio of source.audioTracks ?? []) {
            this.addHlsInput(args, audio.url);
        }

        // Remaining inputs: subtitles
        for (const subtitle of source.subtitleTracks ?? []) {
            this.addHlsInput(args, subtitle.url);
        }

        args.push('-map', '0:v:0');

        const audioTracks = source.audioTracks ?? [];
        if (audioTracks.length > 0) {
            audioTracks.forEach((_audio, index) => {
                const inputIndex = index + 1;

                args.push('-map', `${inputIndex}:a:0`);
            });
        } else {
            args.push('-map', '0:a?');
        }

        const subtitleTracks = source.subtitleTracks ?? [];
        const subtitleInputOffset = 1 + audioTracks.length;
        subtitleTracks.forEach((_subtitle, index) => {
            const inputIndex = subtitleInputOffset + index;

            args.push('-map', `${inputIndex}:s:0?`);
        });

        args.push(
            '-c:v',
            'copy',

            '-c:a',
            'copy',

            '-c:s',
            'srt',
        );

        this.addAudioMetadata(args, audioTracks);
        this.addSubtitleMetadata(args, subtitleTracks);

        args.push(outputPath);

        return args;
    }

    private addHlsInput(args: string[], url: string): void {
        args.push(
            '-http_persistent',
            '1',

            '-http_multiple',
            '1',

            '-i',
            url,
        );
    }

    private addAudioMetadata(
        args: string[],
        tracks: HlsStreamDto['audioTracks'],
    ): void {
        tracks?.forEach((track, index) => {
            if (track.language) {
                args.push(
                    `-metadata:s:a:${index}`,
                    `language=${track.language}`,
                );
            }

            if (track.name) {
                args.push(`-metadata:s:a:${index}`, `title=${track.name}`);
            }

            args.push(
                `-disposition:a:${index}`,
                track.default ? 'default' : '0',
            );
        });
    }

    private addSubtitleMetadata(
        args: string[],
        tracks: HlsStreamDto['subtitleTracks'],
    ): void {
        tracks?.forEach((track, index) => {
            if (track.language) {
                args.push(
                    `-metadata:s:s:${index}`,
                    `language=${track.language}`,
                );
            }

            if (track.name) {
                args.push(`-metadata:s:s:${index}`, `title=${track.name}`);
            }

            const dispositions: string[] = [];

            if (track.default) {
                dispositions.push('default');
            }

            if (track.forced) {
                dispositions.push('forced');
            }

            args.push(
                `-disposition:s:${index}`,
                dispositions.length > 0 ? dispositions.join('+') : '0',
            );
        });
    }
}
