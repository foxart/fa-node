import {
  MysqlMigrationClassAddColumn,
  MysqlMigrationClassAddCompositeIndex,
  MysqlMigrationClassAddForeignKey,
  MysqlMigrationClassAddIndex,
  MysqlMigrationClassAddUniqueIndex,
  MysqlMigrationClassCreateTable,
  MysqlMigrationClassDeleteRows,
  MysqlMigrationClassDropColumn,
  MysqlMigrationClassInsertRows,
  MysqlMigrationClassModifyColumn,
  MysqlMigrationClassRenameColumn,
  MysqlMigrationClassRenameTable,
  MysqlMigrationClassTruncateTable,
  MysqlMigrationClassUpdateRows,
} from './migration-mysql.template';

describe('migration-mysql template', () => {
  it('should execute every generated migration in both directions', async () => {
    const connection = {
      execute: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const migrationList = [
      new MysqlMigrationClassCreateTable(),
      new MysqlMigrationClassRenameTable(),
      new MysqlMigrationClassAddColumn(),
      new MysqlMigrationClassModifyColumn(),
      new MysqlMigrationClassRenameColumn(),
      new MysqlMigrationClassDropColumn(),
      new MysqlMigrationClassAddIndex(),
      new MysqlMigrationClassAddUniqueIndex(),
      new MysqlMigrationClassAddCompositeIndex(),
      new MysqlMigrationClassAddForeignKey(),
      new MysqlMigrationClassInsertRows(),
      new MysqlMigrationClassUpdateRows(),
      new MysqlMigrationClassDeleteRows(),
      new MysqlMigrationClassTruncateTable(),
    ];

    for (const migration of migrationList) {
      await migration.up(connection as never);
      await migration.down(connection as never);
    }

    expect(connection.query).toHaveBeenCalledTimes(21);
    expect(connection.execute).toHaveBeenCalledTimes(6);
  });
});
