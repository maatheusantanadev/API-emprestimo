import { Module } from '@nestjs/common';
import { EMPRESTIMOS_REPOSITORY } from './repositories/emprestimos.repository';
import { PrismaEmprestimosRepository } from './repositories/prisma-emprestimos.repository';

/**
 * Expõe o repositório de empréstimos isoladamente, para que o MargemModule possa
 * ler os empréstimos ativos sem depender do EmprestimosModule (evita ciclo).
 */
@Module({
  providers: [{ provide: EMPRESTIMOS_REPOSITORY, useClass: PrismaEmprestimosRepository }],
  exports: [EMPRESTIMOS_REPOSITORY],
})
export class EmprestimosPersistenceModule {}
