import { Module } from '@nestjs/common';
import { IDENTIFICADORES_REPOSITORY } from './repositories/identificadores.repository';
import { PrismaIdentificadoresRepository } from './repositories/prisma-identificadores.repository';
import { UnicidadeService } from './services/unicidade.service';

@Module({
  providers: [
    UnicidadeService,
    { provide: IDENTIFICADORES_REPOSITORY, useClass: PrismaIdentificadoresRepository },
  ],
  exports: [UnicidadeService],
})
export class IdentificadoresModule {}
