import { Logger } from '@nestjs/common';
import z from 'zod';

const logger = new Logger('Configuration');

export const envSchema = z.object({
    API_KEY: z.string().min(1, 'API_KEY is required'),
});

export const validateEnv = (): z.infer<typeof envSchema> => {
    const parsed = envSchema.parse(process.env);
    logger.log('Environment variables validated successfully');
    return parsed;
};
