import { KeyedMutex } from '../../src/common/concurrency/keyed-mutex';

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('KeyedMutex', () => {
  it('serializa tarefas da mesma chave', async () => {
    const mutex = new KeyedMutex();
    const eventos: string[] = [];
    const tarefa = (nome: string) => async () => {
      eventos.push(`${nome}:inicio`);
      await tick();
      eventos.push(`${nome}:fim`);
    };

    await Promise.all([mutex.runExclusive('a', tarefa('1')), mutex.runExclusive('a', tarefa('2'))]);
    expect(eventos).toEqual(['1:inicio', '1:fim', '2:inicio', '2:fim']);
  });

  it('chaves diferentes rodam em paralelo', async () => {
    const mutex = new KeyedMutex();
    const eventos: string[] = [];
    const tarefa = (nome: string) => async () => {
      eventos.push(`${nome}:inicio`);
      await tick();
      eventos.push(`${nome}:fim`);
    };

    await Promise.all([mutex.runExclusive('a', tarefa('a')), mutex.runExclusive('b', tarefa('b'))]);
    expect(eventos.slice(0, 2).sort()).toEqual(['a:inicio', 'b:inicio']);
  });

  it('libera a chave mesmo quando a tarefa falha', async () => {
    const mutex = new KeyedMutex();
    await expect(mutex.runExclusive('a', async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(mutex.runExclusive('a', async () => 'ok')).resolves.toBe('ok');
  });
});
