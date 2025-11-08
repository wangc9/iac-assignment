import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './schema';

export const KYSELY_INSTANCE = 'KyselyInstance';

@Global()
@Module({
  providers: [
    {
      provide: KYSELY_INSTANCE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dialect = new PostgresDialect({
          pool: new Pool({
            host: configService.get<string>('DB_HOST'),
            port: configService.get<number>('DB_PORT'),
            database: configService.get<string>('DB_NAME'),
            user: configService.get<string>('DB_USER'),
            password: configService.get<string>('DB_PASSWORD'),
            ssl: {
              rejectUnauthorized: false,
            },
          }),
        });

        return new Kysely<Database>({ dialect });
      },
    },
  ],
  exports: [KYSELY_INSTANCE],
})
export class DatabaseModule {}
