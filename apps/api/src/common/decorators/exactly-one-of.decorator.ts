import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function ExactlyOneOf(fields: string[], validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'ExactlyOneOf',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [fields],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedFields] = args.constraints;
          const obj = args.object as any;
          const definedCount = relatedFields.filter((field: string) => {
            const val = obj[field];
            return val !== undefined && val !== null && val !== '';
          }).length;
          return definedCount === 1;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedFields] = args.constraints;
          return `Geçerli bir istek için [${relatedFields.join(', ')}] parametrelerinden tam olarak biri tanımlanmalıdır.`;
        },
      },
    });
  };
}
