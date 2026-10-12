import { Inject, Injectable } from '@nestjs/common';
import { ConflictError } from '../../../common/errors/domain.errors';
import {
  IDENTIFICADORES_REPOSITORY,
  Identificador,
  IdentificadoresRepository,
  TipoIdentificador,
} from '../repositories/identificadores.repository';

/** Identificador acompanhado do nome do campo da requisição (para o `details` do erro). */
export interface IdentificadorDoCampo extends Identificador {
  campo: string;
}

const ROTULOS: Record<TipoIdentificador, string> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
  email: 'E-mail',
};

@Injectable()
export class UnicidadeService {
  constructor(
    @Inject(IDENTIFICADORES_REPOSITORY)
    private readonly identificadores: IdentificadoresRepository,
  ) {}

  /**
   * Garante que CPF / CNPJ / e-mail ainda não existem em NENHUMA entidade.
   * @throws ConflictError (409) com a lista de campos duplicados.
   */
  async garantirDisponiveis(candidatos: IdentificadorDoCampo[]): Promise<void> {
    const existentes = await this.identificadores.findExistentes(candidatos);
    if (existentes.length === 0) return;

    const duplicados = candidatos.filter((c) =>
      existentes.some((e) => e.tipo === c.tipo && e.valor === c.valor),
    );
    const [primeiro] = duplicados;

    throw new ConflictError(`${ROTULOS[primeiro.tipo]} já cadastrado`, {
      campos: duplicados.map((d) => d.campo),
    });
  }
}
