import { DecoratorClass } from '../../src/classes/decorator.class';

abstract class AbstractClass {}

export class ExtendedAbstractClass extends AbstractClass {}

export class DecoratorServiceParamKeyDto {
  public key: string;
}

export class DecoratorServiceParamValueDto {
  public value: number;
}

export class DecoratorServiceMethodEntity {
  public key: string;

  public value: number;
}

const Decorator = new DecoratorClass('__FA_DECORATOR__');
export const ClassDecorator = (data: string): ClassDecorator => {
  return Decorator.decorateClass({
    data: data,
  });
};
export const MethodDecorator = (data: string): MethodDecorator => {
  return Decorator.decorateMethod({
    data: data,
    beforeParameterCallback: (metadata, ...params): unknown[] => {
      // console.log(`${MethodDecorator.name}-beforeParameter`, params);
      // console.log(`${MethodDecorator.name}-beforeParameter`, metadata);
      const keyDto = params[0] as DecoratorServiceParamKeyDto;
      const valueDto = params[1] as DecoratorServiceParamValueDto;
      keyDto.key = `beforeParameter-${keyDto.key}`;
      valueDto.value = valueDto.value * 10;
      return params;
    },
    afterResultCallback: (metadata, result): unknown => {
      // console.log(`${MethodDecorator.name}-afterResult`, result);
      // console.log(`${MethodDecorator.name}-afterResult`, metadata);
      const methodEntity = result as DecoratorServiceMethodEntity;
      methodEntity.key = `${methodEntity.key}-afterResult`;
      methodEntity.value = methodEntity.value / 10;
      return result;
    },
  });
};
export const MethodDecoratorArray = (data: string): MethodDecorator => {
  return Decorator.decorateMethod({
    data: data,
    beforeParameterCallback: (metadata, ...params): unknown[] => {
      // console.log(`${MethodDecoratorArray.name}-beforeParameterArray`, params);
      // console.log(`${MethodDecoratorArray.name}-beforeParameterArray`, metadata);
      const keyDto = params[0] as DecoratorServiceParamKeyDto;
      const valueDto = params[1] as DecoratorServiceParamValueDto;
      keyDto.key = `beforeParameterArray-${keyDto.key}`;
      valueDto.value = valueDto.value * 10;
      return params;
    },
    afterResultCallback: (metadata, result): unknown => {
      // console.log(`${MethodDecoratorArray.name}-afterResultArray`, result);
      // console.log(`${MethodDecoratorArray.name}-afterResultArray`, metadata);
      const methodEntity = result as DecoratorServiceMethodEntity[];
      methodEntity[0].key = `${methodEntity[0].key}-afterResultArray`;
      methodEntity[0].value = methodEntity[0].value / 10;
      return result;
    },
  });
};
export const MethodDecoratorGetter = (data: string): MethodDecorator => {
  return Decorator.decorateMethod({
    data: data,
    beforeParameterCallback: (metadata, ...params): unknown[] => {
      console.log(`${MethodDecoratorGetter.name}-beforeParameterGetter`, params);
      // console.log(`${MethodDecoratorGetter.name}-beforeParameterGetter`, metadata);
      return params;
    },
    afterResultCallback: (metadata, result): unknown => {
      console.log(`${MethodDecoratorGetter.name}-afterResultGetter`, result);
      // console.log(`${MethodDecoratorGetter.name}-afterResultGetter`, metadata);
      const methodEntity = result as DecoratorServiceMethodEntity;
      methodEntity.key = `${methodEntity.key}-afterResultGetter`;
      return result;
    },
  });
};
export const MethodDecoratorSetter = (data: string): MethodDecorator => {
  return Decorator.decorateMethod({
    data: data,
    beforeParameterCallback: (metadata, ...params): unknown[] => {
      console.log(`${MethodDecoratorSetter.name}-beforeParameterSetter`, params);
      // console.log(`${MethodDecoratorSetter.name}-beforeParameterSetter`, metadata);
      const keyDto = params[0] as DecoratorServiceParamKeyDto;
      keyDto.key = `beforeParameterSetter-${keyDto.key}`;
      return params;
    },
    afterResultCallback: (metadata, result): unknown => {
      console.log(`${MethodDecoratorSetter.name}-afterResultSetter`, result);
      // console.log(`${MethodDecoratorSetter.name}-afterResultSetter`, metadata);
      return result;
    },
  });
};
export const ParamKeyDto = (data: string): ParameterDecorator => {
  return Decorator.decorateParameter({
    data: data,
    callback: (metadata, parameter: DecoratorServiceParamKeyDto): unknown => {
      // console.log(ParamKeyDto.name, parameter);
      // console.log(ParamKeyDto.name, metadata);
      parameter.key = `ParamKeyDto( ${parameter.key} )`;
      return parameter;
    },
  });
};
export const ParamValueDto = (data: string): ParameterDecorator => {
  return Decorator.decorateParameter({
    data: data,
    callback: (metadata, parameter: DecoratorServiceParamValueDto): unknown => {
      // console.log(ParamValueDto.name, parameter);
      // console.log(ParamValueDto.name, metadata);
      parameter.value = parameter.value + 5;
      return parameter;
    },
  });
};
export const ParamValueDtoMultiple = (multiplier: number): ParameterDecorator => {
  return Decorator.decorateParameter({
    data: multiplier,
    callback: (metadata, param: DecoratorServiceParamValueDto): unknown => {
      // console.log(ParamValueDtoMultiple.name, param, multiplier);
      // console.log(ParamValueDtoMultiple.name, metadata);
      param.value = param.value * (metadata.parameterData as number);
      return param;
    },
  });
};
