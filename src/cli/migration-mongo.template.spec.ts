import {
  MongoMigrationClassAddCompositeIndex,
  MongoMigrationClassAddField,
  MongoMigrationClassAddSparseIndex,
  MongoMigrationClassAddTextIndex,
  MongoMigrationClassAddTtlIndex,
  MongoMigrationClassAddUniqueIndex,
  MongoMigrationClassCreateCollection,
  MongoMigrationClassNormalize,
} from './migration-mongo.template';

describe('migration-mongo template', () => {
  it('should execute every generated migration in both directions', async () => {
    const collection = {
      drop: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn().mockResolvedValue(undefined),
      dropIndex: jest.fn().mockResolvedValue(undefined),
    };
    const db = {
      createCollection: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn(() => collection),
    };
    const migrationList = [
      new MongoMigrationClassCreateCollection(),
      new MongoMigrationClassAddField(),
      new MongoMigrationClassNormalize(),
      new MongoMigrationClassAddUniqueIndex(),
      new MongoMigrationClassAddCompositeIndex(),
      new MongoMigrationClassAddTextIndex(),
      new MongoMigrationClassAddTtlIndex(),
      new MongoMigrationClassAddSparseIndex(),
    ];

    for (const migration of migrationList) {
      await migration.up(db as never);
      await migration.down(db as never);
    }

    expect(db.createCollection).toHaveBeenCalledWith('mongoMigrationCollection');
    expect(collection.drop).toHaveBeenCalled();
    expect(collection.updateMany).toHaveBeenCalledTimes(3);
    expect(collection.createIndex).toHaveBeenCalledTimes(5);
    expect(collection.dropIndex).toHaveBeenCalledTimes(5);
  });
});
