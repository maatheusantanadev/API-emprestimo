import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  CNPJ_REGEX,
  CPF_REGEX,
  SENHA_MAX_LENGTH,
  SENHA_MIN_LENGTH,
  TEXTO_MAX_LENGTH,
} from '../../../common/validation/constraints';
import { NormalizeEmail, Trim } from '../../../common/validation/transformers';
import { CriarEmpresaInput } from '../services/empresas.service';

export class CriarEmpresaDto implements CriarEmpresaInput {
  @Trim()
  @IsString({ message: 'cnpj é obrigatório e deve ser texto' })
  @Matches(CNPJ_REGEX, { message: 'cnpj deve conter exatamente 14 dígitos numéricos' })
  cnpj: string;

  @Trim()
  @IsString({ message: 'razaoSocial é obrigatório e deve ser texto' })
  @IsNotEmpty({ message: 'razaoSocial não pode ser vazio' })
  @MaxLength(TEXTO_MAX_LENGTH, { message: `razaoSocial deve ter no máximo ${TEXTO_MAX_LENGTH} caracteres` })
  razaoSocial: string;

  @Trim()
  @IsString({ message: 'nomeRepresentante é obrigatório e deve ser texto' })
  @IsNotEmpty({ message: 'nomeRepresentante não pode ser vazio' })
  @MaxLength(TEXTO_MAX_LENGTH, { message: `nomeRepresentante deve ter no máximo ${TEXTO_MAX_LENGTH} caracteres` })
  nomeRepresentante: string;

  @Trim()
  @IsString({ message: 'cpfRepresentante é obrigatório e deve ser texto' })
  @Matches(CPF_REGEX, { message: 'cpfRepresentante deve conter exatamente 11 dígitos numéricos' })
  cpfRepresentante: string;

  @NormalizeEmail()
  @IsString({ message: 'email é obrigatório e deve ser texto' })
  @IsEmail({}, { message: 'email deve ser um endereço de e-mail válido' })
  @MaxLength(TEXTO_MAX_LENGTH, { message: `email deve ter no máximo ${TEXTO_MAX_LENGTH} caracteres` })
  email: string;

  @IsString({ message: 'senha é obrigatória e deve ser texto' })
  @MinLength(SENHA_MIN_LENGTH, { message: `senha deve ter no mínimo ${SENHA_MIN_LENGTH} caracteres` })
  @MaxLength(SENHA_MAX_LENGTH, { message: `senha deve ter no máximo ${SENHA_MAX_LENGTH} caracteres` })
  senha: string;
}
