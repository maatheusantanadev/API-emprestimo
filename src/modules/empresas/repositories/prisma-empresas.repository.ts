import { Injectable } from '@nestjs/common';
import { Empresa as EmpresaRow } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Empresa, NovaEmpresa } from '../entities/empresa.entity';
import { EmpresasRepository } from './empresas.repository';

@Injectable()
export class PrismaEmpresasRepository implements EmpresasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NovaEmpresa): Promise<Empresa> {
    const [, row] = await this.prisma.$transaction([
      this.prisma.identificadorUnico.createMany({
        data: [
          { tipo: 'cnpj', valor: data.cnpj },
          { tipo: 'cpf', valor: data.cpfRepresentante },
          { tipo: 'email', valor: data.email },
        ],
      }),
      this.prisma.empresa.create({ data }),
    ]);
    return toEntity(row);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.empresa.count({ where: { id } });
    return count > 0;
  }
}

function toEntity(row: EmpresaRow): Empresa {
  return {
    id: row.id,
    cnpj: row.cnpj,
    razaoSocial: row.razaoSocial,
    nomeRepresentante: row.nomeRepresentante,
    cpfRepresentante: row.cpfRepresentante,
    email: row.email,
    createdAt: row.createdAt,
  };
}
