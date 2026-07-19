import { LOGGER_MAP, LoggerEnum } from './logger.map';

describe('LOGGER_MAP', () => {
  it('should define a render style for every logger token', () => {
    const values = Object.values(LOGGER_MAP);

    expect(values).toHaveLength(35);
    expect(values.every(Array.isArray)).toBe(true);
    expect(LOGGER_MAP[LoggerEnum.DEFAULT]).toStrictEqual([]);
    expect(LOGGER_MAP[LoggerEnum.CONTEXT]).toStrictEqual(['\u001b[1m', '\u001b[37m']);
    expect(LOGGER_MAP[LoggerEnum.STRING]).toStrictEqual(['\u001b[32m']);
    expect(LOGGER_MAP[LoggerEnum.PARENTHESIS]).toStrictEqual(['\u001b[1m', '\u001b[35m']);
    expect(LOGGER_MAP[LoggerEnum.SLASH]).toStrictEqual(['\u001b[2m', '\u001b[36m']);
    expect(LOGGER_MAP[LoggerEnum.Quote]).toStrictEqual(['\u001b[32m']);
  });
});
