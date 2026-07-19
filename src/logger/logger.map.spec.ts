import { AnsiHelper } from '../helpers/ansi.helper';
import { LOGGER_MAP, LoggerEnum } from './logger.map';

describe('LOGGER_MAP', () => {
  it('should define a render style for every logger token', () => {
    const values = Object.values(LOGGER_MAP);

    expect(values).toHaveLength(35);
    expect(values.every(Array.isArray)).toBe(true);
    expect(LOGGER_MAP[LoggerEnum.DEFAULT]).toStrictEqual([]);
    expect(LOGGER_MAP[LoggerEnum.CONTEXT]).toStrictEqual([AnsiHelper.ef.bold, AnsiHelper.fg.white]);
    expect(LOGGER_MAP[LoggerEnum.STRING]).toStrictEqual([AnsiHelper.fg.green]);
    expect(LOGGER_MAP[LoggerEnum.PARENTHESIS]).toStrictEqual([AnsiHelper.ef.bold, AnsiHelper.fg.magenta]);
    expect(LOGGER_MAP[LoggerEnum.SLASH]).toStrictEqual([AnsiHelper.ef.dim, AnsiHelper.fg.cyan]);
    expect(LOGGER_MAP[LoggerEnum.Quote]).toStrictEqual([AnsiHelper.fg.green]);
  });
});
