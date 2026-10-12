import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/domain.errors';
import { PASSWORD_HASHER, PasswordHasher } from '../../../common/security/password-hasher';
import { EmpresasService } from '../../empresas/services/empresas.service';
import { UnicidadeService } from '../../identificadores/services/unicidade.service';
import { Funcionario, FuncionarioComEmpresa } from '../entities/funcionario.entity';
import {
  FUNCIONARIOS_REPOSITORY,
  FuncionariosRepository,
} from '../repositories/funcionarios.repository';

export interface CriarFuncionarioInput {
  nomeCompleto: string;
  cpf: string;
  email: string;
  senha: string;
  salario: number;
  empresaId: string;
}

const FUNCIONARIO_NAO_ENCONTRADO = 'Funcionário não encontrado';

@Injectable()
export class FuncionariosService {
  constructor(
    @Inject(FUNCIONARIOS_REPOSITORY) private readonly funcionarios: FuncionariosRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly empresas: EmpresasService,
    private readonly unicidade: UnicidadeService,
  ) {}

  async criar(input: CriarFuncionarioInput): Promise<Funcionario> {
    await this.empresas.garantirExistencia(input.empresaId);
    await this.unicidade.garantirDisponiveis([
      { tipo: 'cpf', valor: input.cpf, campo: 'cpf' },
      { tipo: 'email', valor: input.email, campo: 'email' },
    ]);

    const { senha, ...dados } = input;
    return this.funcionarios.create({ ...dados, senhaHash: await this.passwordHasher.hash(senha) });
  }

  /** @throws NotFoundError (404) */
  async buscarOuFalhar(id: string): Promise<Funcionario> {
    const funcionario = await this.funcionarios.findById(id);
    if (!funcionario) throw new NotFoundError(FUNCIONARIO_NAO_ENCONTRADO);
    return funcionario;
  }

  /** @throws NotFoundError (404) */
  async buscarComEmpresaOuFalhar(id: string): Promise<FuncionarioComEmpresa> {
    const funcionario = await this.funcionarios.findByIdComEmpresa(id);
    if (!funcionario) throw new NotFoundError(FUNCIONARIO_NAO_ENCONTRADO);
    return funcionario;
  }
}
