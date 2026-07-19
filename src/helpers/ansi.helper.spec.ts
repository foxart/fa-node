import { AnsiHelper } from './ansi.helper';

describe('AnsiHelper', () => {
  it('should expose codes and apply them', () => {
    expect(AnsiHelper.apply('plain', [])).toBe('plain');
    expect(AnsiHelper.apply('value', [AnsiHelper.ef.bold, AnsiHelper.fg.red])).toBe(
      `${AnsiHelper.ef.bold}${AnsiHelper.fg.red}value${AnsiHelper.ef.reset}`,
    );
    expect(AnsiHelper.bg.blue).toBe('\u001b[44m');
  });
});
