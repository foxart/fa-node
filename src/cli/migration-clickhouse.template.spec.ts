import { ClickhouseMigrationClass } from './migration-clickhouse.template';

describe('migration-clickhouse template', () => {
  it('executes the generated migration in both directions', async () => {
    const client = {
      command: jest.fn().mockResolvedValue(undefined),
    };
    const migration = new ClickhouseMigrationClass();

    await migration.up(client as never, 'analytics');
    await migration.down(client as never, 'analytics');

    const commandCalls = client.command.mock.calls as unknown as Array<[{ query: string }]>;
    const upCall = commandCalls[0]?.[0];
    const downCall = commandCalls[1]?.[0];
    expect(upCall.query).toContain('ADD COLUMN IF NOT EXISTS clickhouseMigrationColumn String');
    expect(downCall.query).toContain('DROP COLUMN IF EXISTS clickhouseMigrationColumn');
  });
});
