import bcrypt from 'bcryptjs';

interface ParseInterface {
  algorithm: string;
  cost: string;
  salt: string;
  hash: string;
}

class PasswordHelperClass {
  public encrypt(password: string, rounds = 10): string {
    return bcrypt.hashSync(password, rounds);
  }

  public compareSync(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  public async compareAsync(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  public parse(hash: string): ParseInterface {
    const [, algorithm, cost, data] = hash.split('$');
    return { algorithm, cost, salt: data.slice(0, 22), hash: data.slice(22) };
  }
}

export const PasswordHelper = new PasswordHelperClass();
