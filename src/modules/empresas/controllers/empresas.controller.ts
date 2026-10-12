import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CriarEmpresaDto } from '../dto/criar-empresa.dto';
import { EmpresasService } from '../services/empresas.service';
import { EmpresaResponse, presentEmpresa } from '../presenters/empresa.presenter';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  /** 201 | 400 dados inválidos | 409 CNPJ/CPF/e-mail já cadastrado */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarEmpresaDto): Promise<EmpresaResponse> {
    return presentEmpresa(await this.empresas.criar(dto));
  }
}
