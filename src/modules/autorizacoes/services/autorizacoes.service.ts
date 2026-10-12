import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../common/clock/clock';
import { ForbiddenOperationError } from '../../../common/errors/domain.errors';
import { FuncionariosService } from '../../funcionarios/services/funcionarios.service';
import {
  AUTORIZACOES_REPOSITORY,
  AutorizacoesRepository,
} from '../repositories/autorizacoes.repository';

export const VALIDADE_AUTORIZACAO_MS = 24 * 60 * 60 * 1000;

export interface AutorizacaoConcedida {
  funcionarioId: string;
  autorizado: true;
  expiraEm: Date;
}

@Injectable()
export class AutorizacoesService {
  constructor(
    @Inject(AUTORIZACOES_REPOSITORY) private readonly autorizacoes: AutorizacoesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly funcionarios: FuncionariosService,
  ) {}

  /** Concede (ou renova) a autorização: nova janela de 24h a partir de agora. */
  async autorizar(funcionarioId: string): Promise<AutorizacaoConcedida> {
    await this.funcionarios.buscarOuFalhar(funcionarioId);

    const agora = this.clock.now();
    const autorizacao = await this.autorizacoes.create({
      funcionarioId,
      autorizadoEm: agora,
      expiraEm: new Date(agora.getTime() + VALIDADE_AUTORIZACAO_MS),
    });

    return { funcionarioId, autorizado: true, expiraEm: autorizacao.expiraEm };
  }

  /** @throws ForbiddenOperationError (403) se não houver autorização ativa. */
  async exigirAutorizacaoAtiva(funcionarioId: string): Promise<void> {
    const ativa = await this.autorizacoes.findAtiva(funcionarioId, this.clock.now());
    if (!ativa) {
      throw new ForbiddenOperationError(
        'Autorização de consulta ao Dataprev ausente ou expirada',
      );
    }
  }
}
