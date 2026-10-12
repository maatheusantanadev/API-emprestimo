export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  port: number;
  databaseUrl: string;
  dataprevBaseUrl: string;
  gatewayBaseUrl: string;
  /** Timeout (ms) aplicado às chamadas ao Dataprev e ao Gateway. */
  externalTimeoutMs: number;
}

const DEFAULT_PORT = 3000;
const DEFAULT_EXTERNAL_TIMEOUT_MS = 3000;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function positiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Variável de ambiente inválida: ${name}=${raw}`);
  }
  return value;
}

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

/** Lê e valida as variáveis de ambiente uma única vez, falhando rápido no boot. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: positiveInt(env.PORT, DEFAULT_PORT, 'PORT'),
    databaseUrl: required(env, 'DATABASE_URL'),
    dataprevBaseUrl: withoutTrailingSlash(required(env, 'DATAPREV_BASE_URL')),
    gatewayBaseUrl: withoutTrailingSlash(required(env, 'GATEWAY_BASE_URL')),
    externalTimeoutMs: positiveInt(
      env.EXTERNAL_TIMEOUT_MS,
      DEFAULT_EXTERNAL_TIMEOUT_MS,
      'EXTERNAL_TIMEOUT_MS',
    ),
  };
}
