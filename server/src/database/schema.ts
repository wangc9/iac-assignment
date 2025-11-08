import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

export interface UploadsTable {
  id: Generated<number>;
  title: string;
  s3_key: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  uploads: UploadsTable;
}

export type Upload = Selectable<UploadsTable>;
export type NewUpload = Insertable<UploadsTable>;
export type UploadUpdate = Updateable<UploadsTable>;
