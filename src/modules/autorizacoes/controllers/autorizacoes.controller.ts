import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { UuidOrNotFoundPipe } from '../../../common/pipes/uuid-or-not-found.pipe';
import { AutorizacoesService } from '../services/autorizacoes.service';
import { AutorizacaoResponse, presentAutorizacao } from '../presenters/autorizacao.presenter';

@Controller('funcionarios/:funcionarioId/autorizacao-consulta')
export class AutorizacoesController {
  constructor(private readonly autorizacoes: AutorizacoesService) {}

  /** 200 (concede ou renova por 24h) | 404 funcionário não encontrado */
  @Post()
  @HttpCode(HttpStatus.OK)
  async autorizar(
    @Param('funcionarioId', new UuidOrNotFoundPipe('Funcionário não encontrado')) funcionarioId: string,
  ): Promise<AutorizacaoResponse> {
    return presentAutorizacao(await this.autorizacoes.autorizar(funcionarioId));
  }
}
