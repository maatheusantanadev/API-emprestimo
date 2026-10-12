import { Injectable } from '@nestjs/common';

/**
 * Exclusão mútua por chave (ex.: funcionarioId), em memória.
 *
 * Serializa as solicitações de empréstimo de um mesmo funcionário para que duas
 * requisições simultâneas não ultrapassem o limite de 3 ativos nem a margem.
 * Vale para uma instância da API; com várias réplicas o equivalente seria um
 * lock no banco (ex.: pg_advisory_xact_lock).
 */
@Injectable()
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    const tail = previous.then(() => current);
    this.tails.set(key, tail);

    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}
