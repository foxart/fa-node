// GENERATED CODE -- DO NOT EDIT!
import { Db } from 'mongodb';
// import { MigrationMongoInterface } from 'fa-node';
import { MigrationMongoInterface } from './migration-mongo.helper';

const COLLECTION = 'mongoMigrationCollection';
const FIELD = 'mongoMigrationField';
const INDEX = 'mongo_migration_index';

export class MongoMigrationClass implements MigrationMongoInterface {
  public async up(db: Db): Promise<void> {
    await db.collection(COLLECTION).createIndex(
      {
        [FIELD]: 1,
      },
      {
        name: INDEX,
        unique: true,
      },
    );
  }

  public async down(db: Db): Promise<void> {
    await db.collection(COLLECTION).dropIndex(INDEX);
  }
}
