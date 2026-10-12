/** Regras de formato compartilhadas pelos DTOs. */
export const CPF_REGEX = /^\d{11}$/;
export const CNPJ_REGEX = /^\d{14}$/;

export const SENHA_MIN_LENGTH = 8;
/** bcrypt considera apenas os primeiros 72 bytes da senha. */
export const SENHA_MAX_LENGTH = 72;
export const TEXTO_MAX_LENGTH = 255;

/** Limite de NUMERIC(12,2). */
export const VALOR_MONETARIO_MAX = 9_999_999_999.99;
export const VALOR_MONETARIO_MIN = 0.01;

export const MONEY_NUMBER_OPTIONS = { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 };
