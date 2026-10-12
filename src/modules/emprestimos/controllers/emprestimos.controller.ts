import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { UuidOrNotFoundPipe } from '../../../common/pipes/uuid-or-not-found.pipe';
import { ListarEmprestimosQuery } from '../dto/listar-emprestimos.query';
import { SimularEmprestimoDto } from '../dto/simular-emprestimo.dto';
import { SolicitarEmprestimoDto } from '../dto/solicitar-emprestimo.dto';
import { EmprestimosService } from '../services/emprestimos.service';
import {
  EmprestimoResponse,
  ListaEmprestimosResponse,
  SimulacaoEmprestimoResponse,
  presentEmprestimo,
  presentListaEmprestimos,
  presentSimulacao,
} from '../presenters/emprestimo.presenter';
import { SimulacaoService } from '../services/simulacao.service';

@Controller('emprestimos')
export class EmprestimosController {
  constructor(
    private readonly emprestimos: EmprestimosService,
    private readonly simulacao: SimulacaoService,
  ) {}

  /** 200 | 400 dados inválidos ou valor acima da margem | 403 sem autorização | 404 funcionário */
  @Post('simular')
  @HttpCode(HttpStatus.OK)
  async simular(@Body() dto: SimularEmprestimoDto): Promise<SimulacaoEmprestimoResponse> {
    return presentSimulacao(await this.simulacao.simular(dto));
  }

  /**
   * 201 (aprovado | rejeitado | erro_processamento) | 400 | 403 | 404
   * | 422 empresa não habilitada | 502 Dataprev indisponível
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async solicitar(@Body() dto: SolicitarEmprestimoDto): Promise<EmprestimoResponse> {
    return presentEmprestimo(await this.emprestimos.solicitar(dto));
  }

  /** 200 — filtros opcionais: funcionarioId, status */
  @Get()
  async listar(@Query() query: ListarEmprestimosQuery): Promise<ListaEmprestimosResponse> {
    return presentListaEmprestimos(
      await this.emprestimos.listar({ funcionarioId: query.funcionarioId, status: query.status }),
    );
  }

  /** 200 | 404 empréstimo não encontrado */
  @Get(':emprestimoId')
  async detalhar(
    @Param('emprestimoId', new UuidOrNotFoundPipe('Empréstimo não encontrado')) emprestimoId: string,
  ): Promise<EmprestimoResponse> {
    return presentEmprestimo(await this.emprestimos.detalhar(emprestimoId));
  }
}
