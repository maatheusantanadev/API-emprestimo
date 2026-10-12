import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AutorizacaoConsulta,
  NovaAutorizacaoConsulta,
} from '../entities/autorizacao.entity';
import { AutorizacoesRepository } from './autorizacoes.repository';

@Injectable()
export class PrismaAutorizacoesRepository implements AutorizacoesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: NovaAutorizacaoConsulta): Promise<AutorizacaoConsulta> {
    return this.prisma.autorizacaoConsulta.create({ data });
  }

  findAtiva(funcionarioId: string, agora: Date): Promise<AutorizacaoConsulta | null> {
    return this.prisma.autorizacaoConsulta.findFirst({
      where: { funcionarioId, expiraEm: { gt: agora } },
      orderBy: { expiraEm: 'desc' },
    });
  }
}
