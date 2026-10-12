import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CriarFuncionarioDto } from '../dto/criar-funcionario.dto';
import { FuncionariosService } from '../services/funcionarios.service';
import { FuncionarioResponse, presentFuncionario } from '../presenters/funcionario.presenter';

@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly funcionarios: FuncionariosService) {}

  /** 201 | 400 dados inválidos | 404 empresa não encontrada | 409 CPF/e-mail já cadastrado */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarFuncionarioDto): Promise<FuncionarioResponse> {
    return presentFuncionario(await this.funcionarios.criar(dto));
  }
}
