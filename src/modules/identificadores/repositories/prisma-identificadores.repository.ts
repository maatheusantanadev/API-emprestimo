import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Identificador,
  IdentificadoresRepository,
  TipoIdentificador,
} from './identificadores.repository';

@Injectable()
export class PrismaIdentificadoresRepository implements IdentificadoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findExistentes(identificadores: Identificador[]): Promise<Identificador[]> {
    if (identificadores.length === 0) return [];

    const rows = await this.prisma.identificadorUnico.findMany({
      where: { OR: identificadores.map(({ tipo, valor }) => ({ tipo, valor })) },
    });

    return rows.map((row) => ({ tipo: row.tipo as TipoIdentificador, valor: row.valor }));
  }
}
