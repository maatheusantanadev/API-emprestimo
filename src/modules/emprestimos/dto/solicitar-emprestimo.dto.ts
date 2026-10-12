import { IsInt, Max, Min } from 'class-validator';
import { MAX_PARCELAS, MIN_PARCELAS } from '../domain/parcelamento';
import { SolicitarEmprestimoInput } from '../services/emprestimos.service';
import { SimularEmprestimoDto } from './simular-emprestimo.dto';

export class SolicitarEmprestimoDto extends SimularEmprestimoDto implements SolicitarEmprestimoInput {
  @IsInt({ message: 'numeroParcelas é obrigatório e deve ser um número inteiro' })
  @Min(MIN_PARCELAS, { message: `numeroParcelas deve estar entre ${MIN_PARCELAS} e ${MAX_PARCELAS}` })
  @Max(MAX_PARCELAS, { message: `numeroParcelas deve estar entre ${MIN_PARCELAS} e ${MAX_PARCELAS}` })
  numeroParcelas: number;
}
