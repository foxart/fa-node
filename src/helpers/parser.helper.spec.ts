import { ParserHelper } from './parser.helper';

describe('ParserHelper', () => {
  it('should parse paths with and without extensions', () => {
    expect(ParserHelper.path('/tmp/archive.tar')).toStrictEqual({ directory: '/tmp', filename: 'archive', extension: '.tar' });
    expect(ParserHelper.path('README')).toStrictEqual({ directory: '', filename: 'README', extension: 'README' });
  });

  it('should parse URLs and reject unsupported protocols', () => {
    expect(ParserHelper.url('ftp://example.com')).toBeNull();
    expect(ParserHelper.url('https://example.com:8080/path?a=hello%20world&empty=#hash=yes')).toStrictEqual({
      href: 'https://example.com:8080/path?a=hello%20world&empty=#hash=yes', protocol: 'https:', host: 'example.com:8080', hostname: 'example.com', port: '8080', pathname: '/path', search: 'a=hello%20world&empty=', searchParams: { a: 'hello world', empty: '' }, hash: 'hash=yes', hashParams: { hash: 'yes' },
    });
    expect(ParserHelper.url('http://example.com')).toMatchObject({ searchParams: undefined, hashParams: undefined });
  });
});
