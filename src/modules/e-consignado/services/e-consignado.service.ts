import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleViolationError } from '../../../common/errors/domain.errors';
import { DATAPREV_CLIENT, DataprevClient } from '../../../integrations/dataprev/dataprev.client';

/** Regras de negócio que dependem do Dataprev (e-Consignado). */
@Injectable()
export class EConsignadoService {
  constructor(@Inject(DATAPREV_CLIENT) private readonly dataprev: DataprevClient) {}

  /**
   * @throws BusinessRuleViolationError (422) se a empresa não estiver habilitada.
   * @throws ExternalServiceUnavailableError (502) se o Dataprev estiver indisponível.
   */
  async garantirEmpresaHabilitada(cnpj: string): Promise<void> {
    const habilitada = await this.dataprev.isEmpresaHabilitada(cnpj);
    if (!habilitada) {
      throw new BusinessRuleViolationError('Empresa não habilitada no e-Consignado', { cnpj });
    }
  }

  /** @throws ExternalServiceUnavailableError (502) se o Dataprev estiver indisponível. */
  consultarScore(cpf: string): Promise<number> {
    return this.dataprev.consultarScore(cpf);
  }
}
