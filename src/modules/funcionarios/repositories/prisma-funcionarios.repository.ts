import { Injectable } from '@nestjs/common';
import { Funcionario as FuncionarioRow } from '@prisma/client';
import { decimalToNumber, toDecimalString } from '../../../common/utils/money';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Funcionario,
  FuncionarioComEmpresa,
  NovoFuncionario,
} from '../entities/funcionario.entity';
import { FuncionariosRepository } from './funcionarios.repository';

@Injectable()
export class PrismaFuncionariosRepository implements FuncionariosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NovoFuncionario): Promise<Funcionario> {
    const [, row] = await this.prisma.$transaction([
      this.prisma.identificadorUnico.createMany({
        data: [
          { tipo: 'cpf', valor: data.cpf },
          { tipo: 'email', valor: data.email },
        ],
      }),
      this.prisma.funcionario.create({
        data: { ...data, salario: toDecimalString(data.salario) },
      }),
    ]);
    return toEntity(row);
  }

  async findById(id: string): Promise<Funcionario | null> {
    const row = await this.prisma.funcionario.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async findByIdComEmpresa(id: string): Promise<FuncionarioComEmpresa | null> {
    const row = await this.prisma.funcionario.findUnique({
      where: { id },
      include: { empresa: { select: { cnpj: true } } },
    });
    return row ? { ...toEntity(row), empresaCnpj: row.empresa.cnpj } : null;
  }
}

function toEntity(row: FuncionarioRow): Funcionario {
  return {
    id: row.id,
    nomeCompleto: row.nomeCompleto,
    cpf: row.cpf,
    email: row.email,
    salario: decimalToNumber(row.salario),
    empresaId: row.empresaId,
    createdAt: row.createdAt,
  };
}
