import { ConverterHelper } from './converter.helper';

interface AddressInterface {
  city: string;
  country: string;
  countryCode: string;
  postalCode: string;
  street: string;
  phone: string;
  domain: string;
  email: string;
}

interface LocationInterface {
  city: string;
  country: string;
  countryCode: string;
  phoneCode: string;
  postalCode: string;
  street: string;
}

const COLOR_LIST = [
  // Browns / warm neutrals
  '#A47864', // muted brown
  '#31231A', // dark brown
  '#52361E', // chocolate brown
  '#9E7967', // dusty rose brown
  '#552619', // deep reddish brown
  '#715A5A', // muted brown gray
  // Beige / cream / sand
  '#C9B27C', // sand / khaki
  '#DCCCBD', // light beige
  '#EDE3D9', // very light cream
  '#F1E3BC', // pale yellow
  '#E9E0D4', // warm light beige
  '#FFF2EF', // soft peach
  '#FFDBB6', // light apricot
  // Yellows
  '#EDEAB1', // soft pastel yellow
  // Pinks / reds / mauves
  '#512C3A', // dark mauve
  '#FF654F', // coral red
  '#B2456E', // raspberry pink
  '#FBEAE7', // very light pink
  '#E5DADA', // pale gray pink
  '#F7A5A5', // soft red pink
  // Greens / teals / mint
  '#71ADBA', // desaturated teal
  '#EDF4F2', // icy mint
  '#7C8363', // olive gray
  '#31473A', // deep green
  '#56615D', // dark gray green
  // Blues / grays / slate
  '#4C5578', // muted indigo
  '#B8CCD0', // light blue gray
  '#6C767E', // steel gray
  '#D3DAD9', // cool light gray
  '#44444E', // dark slate
] as const;

const LOCATION_LIST: LocationInterface[] = [
  {
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    phoneCode: '+31',
    postalCode: '1011AB',
    street: 'Damrak',
  },
  {
    city: 'Andorra la Vella',
    country: 'Andorra',
    countryCode: 'AD',
    phoneCode: '+376',
    postalCode: 'AD500',
    street: 'Avinguda Meritxell',
  },
  { city: 'Athens', country: 'Greece', countryCode: 'GR', phoneCode: '+30', postalCode: '10552', street: 'Ermou' },
  {
    city: 'Belgrade',
    country: 'Serbia',
    countryCode: 'RS',
    phoneCode: '+381',
    postalCode: '11000',
    street: 'Knez Mihailova',
  },
  {
    city: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
    phoneCode: '+49',
    postalCode: '10117',
    street: 'Unter den Linden',
  },
  {
    city: 'Bern',
    country: 'Switzerland',
    countryCode: 'CH',
    phoneCode: '+41',
    postalCode: '3000',
    street: 'Marktgasse',
  },
  {
    city: 'Bratislava',
    country: 'Slovakia',
    countryCode: 'SK',
    phoneCode: '+421',
    postalCode: '81101',
    street: 'Obchodná',
  },
  {
    city: 'Brussels',
    country: 'Belgium',
    countryCode: 'BE',
    phoneCode: '+32',
    postalCode: '1000',
    street: 'Rue de la Loi',
  },
  {
    city: 'Bucharest',
    country: 'Romania',
    countryCode: 'RO',
    phoneCode: '+40',
    postalCode: '010011',
    street: 'Calea Victoriei',
  },
  {
    city: 'Budapest',
    country: 'Hungary',
    countryCode: 'HU',
    phoneCode: '+36',
    postalCode: '1051',
    street: 'Andrássy út',
  },
  {
    city: 'Chisinau',
    country: 'Moldova',
    countryCode: 'MD',
    phoneCode: '+373',
    postalCode: '2012',
    street: 'Strada Ștefan cel Mare',
  },
  {
    city: 'Copenhagen',
    country: 'Denmark',
    countryCode: 'DK',
    phoneCode: '+45',
    postalCode: '1000',
    street: 'Strøget',
  },
  {
    city: 'Dublin',
    country: 'Ireland',
    countryCode: 'IE',
    phoneCode: '+353',
    postalCode: 'D02',
    street: 'O’Connell Street',
  },
  {
    city: 'Helsinki',
    country: 'Finland',
    countryCode: 'FI',
    phoneCode: '+358',
    postalCode: '00100',
    street: 'Esplanadi',
  },
  {
    city: 'Kiev',
    country: 'Ukraine',
    countryCode: 'UA',
    phoneCode: '+380',
    postalCode: '01001',
    street: 'Khreshchatyk',
  },
  {
    city: 'Lisbon',
    country: 'Portugal',
    countryCode: 'PT',
    phoneCode: '+351',
    postalCode: '1100-123',
    street: 'Rua Augusta',
  },
  {
    city: 'Ljubljana',
    country: 'Slovenia',
    countryCode: 'SI',
    phoneCode: '+386',
    postalCode: '1000',
    street: 'Slovenska cesta',
  },
  {
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    phoneCode: '+44',
    postalCode: 'SW1A 1AA',
    street: 'Downing Street',
  },
  {
    city: 'Luxembourg',
    country: 'Luxembourg',
    countryCode: 'LU',
    phoneCode: '+352',
    postalCode: 'L-1111',
    street: 'Rue du Saint-Esprit',
  },
  { city: 'Madrid', country: 'Spain', countryCode: 'ES', phoneCode: '+34', postalCode: '28013', street: 'Gran Vía' },
  {
    city: 'Minsk',
    country: 'Belarus',
    countryCode: 'BY',
    phoneCode: '+375',
    postalCode: '220030',
    street: 'Prospekt Nezavisimosti',
  },
  {
    city: 'Monaco',
    country: 'Monaco',
    countryCode: 'MC',
    phoneCode: '+377',
    postalCode: '98000',
    street: 'Boulevard de la Condamine',
  },
  { city: 'Moscow', country: 'Russia', countryCode: 'RU', phoneCode: '+7', postalCode: '101000', street: 'Tverskaya' },
  {
    city: 'Nicosia',
    country: 'Cyprus',
    countryCode: 'CY',
    phoneCode: '+357',
    postalCode: '1016',
    street: 'Ledra Street',
  },
  {
    city: 'Oslo',
    country: 'Norway',
    countryCode: 'NO',
    phoneCode: '+47',
    postalCode: '0150',
    street: 'Karl Johans gate',
  },
  {
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    phoneCode: '+33',
    postalCode: '75001',
    street: 'Rue de Rivoli',
  },
  {
    city: 'Podgorica',
    country: 'Montenegro',
    countryCode: 'ME',
    phoneCode: '+382',
    postalCode: '81000',
    street: 'Ulica Slobode',
  },
  {
    city: 'Prague',
    country: 'Czech Republic',
    countryCode: 'CZ',
    phoneCode: '+420',
    postalCode: '11000',
    street: 'Na Příkopě',
  },
  {
    city: 'Reykjavik',
    country: 'Iceland',
    countryCode: 'IS',
    phoneCode: '+354',
    postalCode: '101',
    street: 'Laugavegur',
  },
  {
    city: 'Riga',
    country: 'Latvia',
    countryCode: 'LV',
    phoneCode: '+371',
    postalCode: 'LV-1050',
    street: 'Brīvības iela',
  },
  { city: 'Rome', country: 'Italy', countryCode: 'IT', phoneCode: '+39', postalCode: '00100', street: 'Via del Corso' },
  {
    city: 'San Marino',
    country: 'San Marino',
    countryCode: 'SM',
    phoneCode: '+378',
    postalCode: '47890',
    street: 'Via Giuseppe Garibaldi',
  },
  {
    city: 'Sarajevo',
    country: 'Bosnia and Herzegovina',
    countryCode: 'BA',
    phoneCode: '+387',
    postalCode: '71000',
    street: 'Ferhadija',
  },
  {
    city: 'Skopje',
    country: 'North Macedonia',
    countryCode: 'MK',
    phoneCode: '+389',
    postalCode: '1000',
    street: 'Macedonia Street',
  },
  {
    city: 'Sofia',
    country: 'Bulgaria',
    countryCode: 'BG',
    phoneCode: '+359',
    postalCode: '1000',
    street: 'Vitosha Boulevard',
  },
  {
    city: 'Stockholm',
    country: 'Sweden',
    countryCode: 'SE',
    phoneCode: '+46',
    postalCode: '111 22',
    street: 'Drottninggatan',
  },
  { city: 'Tallinn', country: 'Estonia', countryCode: 'EE', phoneCode: '+372', postalCode: '10111', street: 'Viru' },
  {
    city: 'Tbilisi',
    country: 'Georgia',
    countryCode: 'GE',
    phoneCode: '+995',
    postalCode: '0105',
    street: 'Rustaveli Avenue',
  },
  {
    city: 'Tirana',
    country: 'Albania',
    countryCode: 'AL',
    phoneCode: '+355',
    postalCode: '1001',
    street: 'Rruga e Kavajës',
  },
  {
    city: 'Vaduz',
    country: 'Liechtenstein',
    countryCode: 'LI',
    phoneCode: '+423',
    postalCode: '9490',
    street: 'Städtle',
  },
  {
    city: 'Valletta',
    country: 'Malta',
    countryCode: 'MT',
    phoneCode: '+356',
    postalCode: 'VLT 1111',
    street: 'Republic Street',
  },
  {
    city: 'Vatican City',
    country: 'Vatican City',
    countryCode: 'VA',
    phoneCode: '+379',
    postalCode: '00120',
    street: 'Via della Conciliazione',
  },
  {
    city: 'Vienna',
    country: 'Austria',
    countryCode: 'AT',
    phoneCode: '+43',
    postalCode: '1010',
    street: 'Kärntner Straße',
  },
  {
    city: 'Vilnius',
    country: 'Lithuania',
    countryCode: 'LT',
    phoneCode: '+370',
    postalCode: '01100',
    street: 'Gedimino pr.',
  },
  {
    city: 'Warsaw',
    country: 'Poland',
    countryCode: 'PL',
    phoneCode: '+48',
    postalCode: '00-001',
    street: 'Nowy Świat',
  },
  {
    city: 'Yerevan',
    country: 'Armenia',
    countryCode: 'AM',
    phoneCode: '+374',
    postalCode: '0010',
    street: 'Abovyan Street',
  },
  { city: 'Zagreb', country: 'Croatia', countryCode: 'HR', phoneCode: '+385', postalCode: '10000', street: 'Ilica' },
] as const;

class RandomSingleton {
  private static self: RandomSingleton;

  private readonly characters = [
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65)).join(''),
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 97)).join(''),
    Array.from({ length: 10 }, (_, i) => i).join(''),
  ].join('');

  public static getInstance(): RandomSingleton {
    if (!RandomSingleton.self) {
      RandomSingleton.self = new RandomSingleton();
    }
    return RandomSingleton.self;
  }

  /* ------------------------------------------------------------------ */
  /* BASE RANDOM                                                         */
  /* ------------------------------------------------------------------ */
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
    const base = COLOR_LIST[this.integer(0, COLOR_LIST.length - 1)];
    const [r, g, b] = ConverterHelper.hexToRgb(base);
    return ConverterHelper.rgbToHex(random(r), random(g), random(b));
  }

  public integer(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  public date(startDate: Date, endDate: Date): Date {
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

  /* ------------------------------------------------------------------ */
  /* LOCATION CORE (EN, DATA-DRIVEN)                                     */
  /* ------------------------------------------------------------------ */
  public city(): string {
    return this.randomLocation().city;
  }

  public country(): string {
    return this.randomLocation().country;
  }

  public street(): string {
    return this.randomLocation().street;
  }

  public postalCode(): string {
    return this.randomLocation().postalCode;
  }

  public phone(phoneCode?: string): string {
    const result = [
      phoneCode ? phoneCode : this.randomLocation().phoneCode,
      this.integer(100, 999),
      this.integer(100, 999),
      this.integer(10, 99),
    ];
    return result.join(' ');
  }

  /* ------------------------------------------------------------------ */
  /* CONTACT                                                             */
  /* ------------------------------------------------------------------ */
  public domain(code?: string): string {
    return `${this.word(this.integer(5, 10)).toLowerCase()}.${(code ? code : this.randomLocation().countryCode).toLowerCase()}`;
  }

  public email(code?: string): string {
    const user = `${this.word(this.integer(3, 8))}.${this.word(this.integer(3, 8))}`.toLowerCase();
    return `${user}@${this.word(this.integer(5, 10)).toLowerCase()}.${(code ? code : this.randomLocation().countryCode).toLowerCase()}`;
  }

  public address(): AddressInterface {
    const location = this.randomLocation();
    return {
      city: location.city,
      country: location.country,
      countryCode: location.countryCode,
      postalCode: location.postalCode,
      street: `${location.street}, ${this.integer(1, 250)}`,
      phone: this.phone(location.phoneCode),
      domain: this.domain(location.countryCode),
      email: this.email(location.countryCode),
    };
  }

  /* ------------------------------------------------------------------ */
  /* CONSISTENT ADDRESS (🔥 MAIN API)                                     */
  /* ------------------------------------------------------------------ */
  private randomLocation(): LocationInterface {
    return LOCATION_LIST[this.integer(0, LOCATION_LIST.length - 1)];
  }
}

export const RandomHelper = RandomSingleton.getInstance();
