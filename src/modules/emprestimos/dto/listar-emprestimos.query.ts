import { IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  FiltrosEmprestimo,
  STATUS_EMPRESTIMO,
  StatusEmprestimo,
} from '../entities/emprestimo.entity';

export class ListarEmprestimosQuery implements FiltrosEmprestimo {
  @IsOptional()
  @IsUUID('all', { message: 'funcionarioId deve ser um UUID válido' })
  funcionarioId?: string;

  @IsOptional()
  @IsIn(STATUS_EMPRESTIMO, { message: `status deve ser um de: ${STATUS_EMPRESTIMO.join(', ')}` })
  status?: StatusEmprestimo;
}
