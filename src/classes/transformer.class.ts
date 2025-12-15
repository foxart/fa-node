import { ClassConstructor, ClassTransformOptions, instanceToPlain, plainToInstance } from 'class-transformer';

export class TransformerClass {
  public constructor(private readonly classTransformOptions: ClassTransformOptions) {}

  public get options(): ClassTransformOptions {
    return this.classTransformOptions;
  }

  public instanceToPlain<I>(instance: I): I {
    return instanceToPlain(instance, this.classTransformOptions) as I;
  }

  public plainToInstance<P, I>(plain: P, classConstructor: ClassConstructor<I>): I {
    return plainToInstance(classConstructor, plain, this.classTransformOptions);
  }
}
