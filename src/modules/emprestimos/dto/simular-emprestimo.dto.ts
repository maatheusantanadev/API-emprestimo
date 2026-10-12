import { IsNumber, IsUUID, Max, Min } from 'class-validator';
import {
  MONEY_NUMBER_OPTIONS,
  VALOR_MONETARIO_MAX,
  VALOR_MONETARIO_MIN,
} from '../../../common/validation/constraints';
import { SimularEmprestimoInput } from '../services/simulacao.service';

export class SimularEmprestimoDto implements SimularEmprestimoInput {
  @IsUUID('all', { message: 'funcionarioId é obrigatório e deve ser um UUID válido' })
  funcionarioId: string;

  @IsNumber(MONEY_NUMBER_OPTIONS, {
    message: 'valorSolicitado é obrigatório e deve ser um número com no máximo 2 casas decimais',
  })
  @Min(VALOR_MONETARIO_MIN, { message: 'valorSolicitado deve ser maior que zero' })
  @Max(VALOR_MONETARIO_MAX, { message: 'valorSolicitado excede o valor máximo permitido' })
  valorSolicitado: number;
}
