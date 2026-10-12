import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/domain.errors';
import { PASSWORD_HASHER, PasswordHasher } from '../../../common/security/password-hasher';
import { UnicidadeService } from '../../identificadores/services/unicidade.service';
import { Empresa } from '../entities/empresa.entity';
import { EMPRESAS_REPOSITORY, EmpresasRepository } from '../repositories/empresas.repository';

export interface CriarEmpresaInput {
  cnpj: string;
  razaoSocial: string;
  nomeRepresentante: string;
  cpfRepresentante: string;
  email: string;
  senha: string;
}

@Injectable()
export class EmpresasService {
  constructor(
    @Inject(EMPRESAS_REPOSITORY) private readonly empresas: EmpresasRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly unicidade: UnicidadeService,
  ) {}

  async criar(input: CriarEmpresaInput): Promise<Empresa> {
    await this.unicidade.garantirDisponiveis([
      { tipo: 'cnpj', valor: input.cnpj, campo: 'cnpj' },
      { tipo: 'cpf', valor: input.cpfRepresentante, campo: 'cpfRepresentante' },
      { tipo: 'email', valor: input.email, campo: 'email' },
    ]);

    const { senha, ...dados } = input;
    return this.empresas.create({ ...dados, senhaHash: await this.passwordHasher.hash(senha) });
  }

  /** @throws NotFoundError (404) */
  async garantirExistencia(id: string): Promise<void> {
    if (!(await this.empresas.exists(id))) {
      throw new NotFoundError('Empresa não encontrada');
    }
  }
}
