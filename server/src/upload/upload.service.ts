import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { KYSELY_INSTANCE } from '../database/database.module';
import { Kysely, sql } from 'kysely';
import { Database } from '../database/schema';
import { ConfigService } from '@nestjs/config';
import { CreateUploadDto } from './dto/create-upload.dto';

@Injectable()
export class UploadService {
  private readonly region: string | undefined;
  private readonly s3Client: S3Client;
  private readonly bucketName: string | undefined;

  constructor(
    @Inject(KYSELY_INSTANCE) private readonly db: Kysely<Database>,
    private readonly configService: ConfigService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION');
    this.s3Client = new S3Client({
      region: this.region,
    });
    this.bucketName = this.configService.get<string>('UPLOAD_BUCKET_NAME');
  }

  async getUploadUrl(contentType: string) {
    const key = crypto.randomBytes(16).toString('hex');

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    if (!this.bucketName) {
      throw new Error('UPLOAD_BUCKET_NAME is not set');
    }

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300,
      });
      return { url, key };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  private async initialiseTable() {
    try {
      await this.db.schema
        .createTable('uploads')
        .ifNotExists()
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('title', 'varchar', (col) => col.notNull())
        .addColumn('s3_key', 'varchar', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) =>
          col.defaultTo(sql`now()`),
        )
        .execute();
    } catch (error) {
      console.log(error);
      return `Error initialising uploads table: ${error}`;
    }
  }

  async createUpload(value: CreateUploadDto) {
    try {
      await this.initialiseTable();
      const newUpload = await this.db
        .insertInto('uploads')
        .values(value)
        .returningAll()
        .executeTakeFirstOrThrow();
      console.log(newUpload);
      return newUpload;
    } catch (error) {
      console.log(error);
      return `Error creating upload: ${error}`;
    }
  }

  async findAll() {
    try {
      await this.initialiseTable();
      const uploads = await this.db.selectFrom('uploads').selectAll().execute();
      return uploads.map((upload) => ({
        ...upload,
        s3_key: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${upload.s3_key}`,
      }));
    } catch (error) {
      console.log(error);
      return `Error fetching uploads: ${error}`;
    }
  }
}
