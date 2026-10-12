import { Transform } from 'class-transformer';

/** Remove espaços nas pontas (apenas se o valor for string; outros tipos seguem para a validação). */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Normaliza e-mail: sem espaços e em minúsculas (unicidade case-insensitive). */
export const NormalizeEmail = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
