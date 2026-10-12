import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CPF_REGEX,
  MONEY_NUMBER_OPTIONS,
  SENHA_MAX_LENGTH,
  SENHA_MIN_LENGTH,
  TEXTO_MAX_LENGTH,
  VALOR_MONETARIO_MAX,
  VALOR_MONETARIO_MIN,
} from '../../../common/validation/constraints';
import { NormalizeEmail, Trim } from '../../../common/validation/transformers';
import { CriarFuncionarioInput } from '../services/funcionarios.service';

export class CriarFuncionarioDto implements CriarFuncionarioInput {
  @Trim()
  @IsString({ message: 'nomeCompleto é obrigatório e deve ser texto' })
  @IsNotEmpty({ message: 'nomeCompleto não pode ser vazio' })
  @MaxLength(TEXTO_MAX_LENGTH, { message: `nomeCompleto deve ter no máximo ${TEXTO_MAX_LENGTH} caracteres` })
  nomeCompleto: string;

  @Trim()
  @IsString({ message: 'cpf é obrigatório e deve ser texto' })
  @Matches(CPF_REGEX, { message: 'cpf deve conter exatamente 11 dígitos numéricos' })
  cpf: string;

  @NormalizeEmail()
  @IsString({ message: 'email é obrigatório e deve ser texto' })
  @IsEmail({}, { message: 'email deve ser um endereço de e-mail válido' })
  @MaxLength(TEXTO_MAX_LENGTH, { message: `email deve ter no máximo ${TEXTO_MAX_LENGTH} caracteres` })
  email: string;

  @IsString({ message: 'senha é obrigatória e deve ser texto' })
  @MinLength(SENHA_MIN_LENGTH, { message: `senha deve ter no mínimo ${SENHA_MIN_LENGTH} caracteres` })
  @MaxLength(SENHA_MAX_LENGTH, { message: `senha deve ter no máximo ${SENHA_MAX_LENGTH} caracteres` })
  senha: string;

  @IsNumber(MONEY_NUMBER_OPTIONS, {
    message: 'salario é obrigatório e deve ser um número com no máximo 2 casas decimais',
  })
  @Min(VALOR_MONETARIO_MIN, { message: `salario deve ser maior ou igual a ${VALOR_MONETARIO_MIN}` })
  @Max(VALOR_MONETARIO_MAX, { message: 'salario excede o valor máximo permitido' })
  salario: number;

  @IsUUID('all', { message: 'empresaId é obrigatório e deve ser um UUID válido' })
  empresaId: string;
}
