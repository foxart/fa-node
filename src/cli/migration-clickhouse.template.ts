// GENERATED CODE -- EDIT BEFORE APPLYING!
import type { ClickHouseClient } from '@clickhouse/client';

const TABLE = 'clickhouseMigrationTable';
const COLUMN = 'clickhouseMigrationColumn';

export class ClickhouseMigrationClass {
  public async up(client: ClickHouseClient, _database: string): Promise<void> {
    void _database;
    await client.command({ query: `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS ${COLUMN} String` });
  }

  public async down(client: ClickHouseClient, _database: string): Promise<void> {
    void _database;
    await client.command({ query: `ALTER TABLE ${TABLE} DROP COLUMN IF EXISTS ${COLUMN}` });
  }
}
