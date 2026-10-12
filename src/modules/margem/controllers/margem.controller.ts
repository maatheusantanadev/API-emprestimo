import { Controller, Get, Param } from '@nestjs/common';
import { UuidOrNotFoundPipe } from '../../../common/pipes/uuid-or-not-found.pipe';
import { MargemService } from '../services/margem.service';
import { MargemResponse, presentMargem } from '../presenters/margem.presenter';

@Controller('funcionarios/:funcionarioId/margem')
export class MargemController {
  constructor(private readonly margem: MargemService) {}

  /** 200 | 403 sem autorização | 404 funcionário | 422 empresa não habilitada | 502 Dataprev */
  @Get()
  async consultar(
    @Param('funcionarioId', new UuidOrNotFoundPipe('Funcionário não encontrado')) funcionarioId: string,
  ): Promise<MargemResponse> {
    return presentMargem(await this.margem.consultar(funcionarioId));
  }
}
