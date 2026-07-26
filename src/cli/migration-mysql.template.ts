// GENERATED CODE -- EDIT BEFORE APPLYING!
import type { Connection } from 'mysql2/promise';
import type { MigrationMysqlCliInterface } from './migration-mysql.cli';

const TABLE = 'mysqlMigrationTable';
const RENAMED_TABLE = 'mysqlMigrationRenamedTable';
const COLUMN = 'mysqlMigrationColumn';
const RENAMED_COLUMN = 'mysqlMigrationRenamedColumn';
const INDEX = 'mysql_migration_index';
const FOREIGN_TABLE = 'mysqlMigrationForeignTable';
const FOREIGN_COLUMN = 'mysqlMigrationForeignColumn';

/** Создание таблицы */
export class MysqlMigrationClassCreateTable implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`
      CREATE TABLE ${TABLE}
      (
        id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        ${COLUMN} VARCHAR(255) NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`DROP TABLE ${TABLE}`);
  }
}

/** Переименование таблицы */
export class MysqlMigrationClassRenameTable implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`RENAME TABLE ${TABLE} TO ${RENAMED_TABLE}`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`RENAME TABLE ${RENAMED_TABLE} TO ${TABLE}`);
  }
}

/** Добавление колонки */
export class MysqlMigrationClassAddColumn implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} ADD COLUMN ${COLUMN} VARCHAR(255) NULL`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} DROP COLUMN ${COLUMN}`);
  }
}

/** Изменение типа колонки */
export class MysqlMigrationClassModifyColumn implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} MODIFY COLUMN ${COLUMN} VARCHAR(512) NOT NULL`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} MODIFY COLUMN ${COLUMN} VARCHAR(255) NOT NULL`);
  }
}

/** Переименование колонки */
export class MysqlMigrationClassRenameColumn implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} RENAME COLUMN ${COLUMN} TO ${RENAMED_COLUMN}`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} RENAME COLUMN ${RENAMED_COLUMN} TO ${COLUMN}`);
  }
}

/** Удаление колонки */
export class MysqlMigrationClassDropColumn implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} DROP COLUMN ${COLUMN}`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} ADD COLUMN ${COLUMN} VARCHAR(255) NULL`);
  }
}

/** Создание обычного индекса */
export class MysqlMigrationClassAddIndex implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`CREATE INDEX ${INDEX} ON ${TABLE} (${COLUMN})`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`DROP INDEX ${INDEX} ON ${TABLE}`);
  }
}

/** Создание уникального индекса */
export class MysqlMigrationClassAddUniqueIndex implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`CREATE UNIQUE INDEX ${INDEX} ON ${TABLE} (${COLUMN})`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`DROP INDEX ${INDEX} ON ${TABLE}`);
  }
}

/** Создание составного индекса */
export class MysqlMigrationClassAddCompositeIndex implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`CREATE INDEX ${INDEX} ON ${TABLE} (${COLUMN}, ${FOREIGN_COLUMN})`);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`DROP INDEX ${INDEX} ON ${TABLE}`);
  }
}

/** Создание внешнего ключа */
export class MysqlMigrationClassAddForeignKey implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`
      ALTER TABLE ${TABLE}
        ADD CONSTRAINT ${INDEX}
          FOREIGN KEY (${FOREIGN_COLUMN}) REFERENCES ${FOREIGN_TABLE} (id)
            ON DELETE CASCADE
    `);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.query(`ALTER TABLE ${TABLE} DROP FOREIGN KEY ${INDEX}`);
  }
}

/** Добавление данных */
export class MysqlMigrationClassInsertRows implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.execute(`INSERT INTO ${TABLE} (${COLUMN}) VALUES (?)`, ['value']);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.execute(`DELETE FROM ${TABLE} WHERE ${COLUMN} = ?`, ['value']);
  }
}

/** Обновление данных */
export class MysqlMigrationClassUpdateRows implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.execute(`UPDATE ${TABLE} SET ${COLUMN} = ? WHERE id = ?`, ['new-value', 1]);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.execute(`UPDATE ${TABLE} SET ${COLUMN} = ? WHERE id = ?`, ['old-value', 1]);
  }
}

/** Удаление данных */
export class MysqlMigrationClassDeleteRows implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.execute(`DELETE FROM ${TABLE} WHERE id = ?`, [1]);
  }

  public async down(connection: Connection): Promise<void> {
    await connection.execute(`INSERT INTO ${TABLE} (id, ${COLUMN}) VALUES (?, ?)`, [1, 'restored-value']);
  }
}

/** Очистка таблицы */
export class MysqlMigrationClassTruncateTable implements MigrationMysqlCliInterface {
  public async up(connection: Connection): Promise<void> {
    await connection.query(`TRUNCATE TABLE ${TABLE}`);
  }

  public down(_connection: Connection): Promise<void> {
    void _connection;
    // Откат невозможен без резервной копии.
    return Promise.resolve();
  }
}
