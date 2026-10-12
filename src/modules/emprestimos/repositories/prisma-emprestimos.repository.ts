import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { dbDateToIsoDate, isoDateToDbDate } from '../../../common/utils/dates';
import { decimalToNumber, toDecimalString } from '../../../common/utils/money';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Emprestimo,
  FiltrosEmprestimo,
  NovoEmprestimo,
  ResumoEmprestimosAtivos,
} from '../entities/emprestimo.entity';
import { EmprestimosRepository } from './emprestimos.repository';

const comParcelas = {
  parcelas: { orderBy: { numero: 'asc' } },
} satisfies Prisma.EmprestimoInclude;

type EmprestimoRow = Prisma.EmprestimoGetPayload<{ include: typeof comParcelas }>;

@Injectable()
export class PrismaEmprestimosRepository implements EmprestimosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NovoEmprestimo): Promise<Emprestimo> {
    // Nested create: o Prisma grava empréstimo + parcelas numa única transação.
    const row = await this.prisma.emprestimo.create({
      data: {
        funcionarioId: data.funcionarioId,
        valorSolicitado: toDecimalString(data.valorSolicitado),
        numeroParcelas: data.numeroParcelas,
        valorParcela: toDecimalString(data.valorParcela),
        status: data.status,
        motivoRejeicao: data.motivoRejeicao,
        gatewayTransacaoId: data.gatewayTransacaoId,
        createdAt: data.createdAt,
        parcelas: {
          create: data.parcelas.map((parcela) => ({
            numero: parcela.numero,
            valor: toDecimalString(parcela.valor),
            dataVencimento: isoDateToDbDate(parcela.dataVencimento),
          })),
        },
      },
      include: comParcelas,
    });
    return toEntity(row);
  }

  async findById(id: string): Promise<Emprestimo | null> {
    const row = await this.prisma.emprestimo.findUnique({ where: { id }, include: comParcelas });
    return row ? toEntity(row) : null;
  }

  async findMany(filtros: FiltrosEmprestimo): Promise<Emprestimo[]> {
    const rows = await this.prisma.emprestimo.findMany({
      where: { funcionarioId: filtros.funcionarioId, status: filtros.status },
      include: comParcelas,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async resumoAtivos(funcionarioId: string): Promise<ResumoEmprestimosAtivos> {
    const result = await this.prisma.emprestimo.aggregate({
      where: { funcionarioId, status: 'aprovado' },
      _count: { _all: true },
      _sum: { valorParcela: true },
    });
    return {
      quantidade: result._count._all,
      somaParcelasMensais: result._sum.valorParcela ? decimalToNumber(result._sum.valorParcela) : 0,
    };
  }
}

function toEntity(row: EmprestimoRow): Emprestimo {
  return {
    id: row.id,
    funcionarioId: row.funcionarioId,
    valorSolicitado: decimalToNumber(row.valorSolicitado),
    numeroParcelas: row.numeroParcelas,
    valorParcela: decimalToNumber(row.valorParcela),
    status: row.status,
    motivoRejeicao: row.motivoRejeicao,
    gatewayTransacaoId: row.gatewayTransacaoId,
    createdAt: row.createdAt,
    parcelas: row.parcelas.map((parcela) => ({
      numero: parcela.numero,
      valor: decimalToNumber(parcela.valor),
      dataVencimento: dbDateToIsoDate(parcela.dataVencimento),
    })),
  };
}
