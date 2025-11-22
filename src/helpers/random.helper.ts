import { DataHelper } from './data.helper';

class RandomSingleton {
  private static self: RandomSingleton;

  private readonly characters = [
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65)).join(''),
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 97)).join(''),
    Array.from({ length: 10 }, (_, i) => i).join(''),
  ].join('');

  private readonly colorList = [
    '#A47864',
    '#C9B27C',
    '#DCCCBD',
    '#EDE3D9',
    '#F1E3BC',
    '#31231A',
    '#52361E',
    '#9E7967',
    '#EDEAB1',
    '#512C3A',
    '#71ADBA',
    '#FF654F',
    '#4C5578',
    '#B2456E',
    '#FBEAE7',
    '#552619',
    '#EDF4F2',
    '#7C8363',
    '#31473A',
    '#E9E0D4',
    '#B8CCD0',
    '#6C767E',
    '#56615D',
    '#E5DADA',
    '#FFF2EF',
    '#FFDBB6',
    '#F7A5A5',
    '#D3DAD9',
    '#715A5A',
    '#44444E',
  ];

  public static getInstance(): RandomSingleton {
    if (!RandomSingleton.self) {
      RandomSingleton.self = new RandomSingleton();
    }
    return RandomSingleton.self;
  }

  /**
   * RANDOM FUNCTIONS
   */
  public boolean(): boolean {
    return Math.random() < 0.5;
  }

  public float(min: number, max: number): number {
    return Math.random() * (max - min + 1) + min;
  }

  public color(delta = 20): string {
    const random = (base: number): number => {
      const shift = this.integer(-delta, delta);
      const v = base + shift;
      return Math.max(0, Math.min(255, v));
    };
    const base = this.colorList[this.integer(0, this.colorList.length - 1)];
    const [r, g, b] = DataHelper.convertHexToRgb(base);
    return DataHelper.convertRgbToHex(random(r), random(g), random(b));
  }

  public integer(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  public date(startDate: Date, endDate: Date): Date {
    // function isLeapYear(year: number): boolean {
    //   return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    // }
    // const year = this.randomInteger(startYear, endYear);
    // const month = this.randomInteger(0, 11);
    // const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // const day = this.randomInteger(1, daysInMonth[month]);
    // const hour = this.randomInteger(0, 23);
    // const minute = this.randomInteger(0, 59);
    // const second = this.randomInteger(0, 59);
    // return new Date(year, month, day, hour, minute, second);
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const randomMs = this.integer(startMs, endMs);
    return new Date(randomMs);
  }

  public string(length = 10): string {
    let counter = 0;
    let result = '';
    while (counter < length) {
      result += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
      counter++;
    }
    return result;
  }

  public word(length = 5): string {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z'];
    let word = '';
    let useVowel = Math.random() > 0.5;
    for (let i = 0; i < length; i++) {
      const letters = useVowel ? vowels : consonants;
      const randomChar = letters[Math.floor(Math.random() * letters.length)];
      word += randomChar;
      useVowel = !useVowel;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

export const RandomHelper = RandomSingleton.getInstance();
