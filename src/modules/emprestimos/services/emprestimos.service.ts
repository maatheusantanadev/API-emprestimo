import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../common/clock/clock';
import { KeyedMutex } from '../../../common/concurrency/keyed-mutex';
import { NotFoundError } from '../../../common/errors/domain.errors';
import {
  PAYMENT_GATEWAY_CLIENT,
  PaymentGatewayClient,
} from '../../../integrations/payment-gateway/payment-gateway.client';
import { AutorizacoesService } from '../../autorizacoes/services/autorizacoes.service';
import { EConsignadoService } from '../../e-consignado/services/e-consignado.service';
import { FuncionarioComEmpresa } from '../../funcionarios/entities/funcionario.entity';
import { FuncionariosService } from '../../funcionarios/services/funcionarios.service';
import { calcularMargem } from '../../margem/margem.calculator';
import { MOTIVOS_REJEICAO, avaliarCredito } from '../domain/avaliacao-credito';
import { calcularValorParcela, gerarParcelas } from '../domain/parcelamento';
import {
  Emprestimo,
  FiltrosEmprestimo,
  StatusEmprestimo,
} from '../entities/emprestimo.entity';
import {
  EMPRESTIMOS_REPOSITORY,
  EmprestimosRepository,
} from '../repositories/emprestimos.repository';

export interface SolicitarEmprestimoInput {
  funcionarioId: string;
  valorSolicitado: number;
  numeroParcelas: number;
}

interface Desfecho {
  status: StatusEmprestimo;
  motivoRejeicao: string | null;
  gatewayTransacaoId: string | null;
}

@Injectable()
export class EmprestimosService {
  constructor(
    @Inject(EMPRESTIMOS_REPOSITORY) private readonly emprestimos: EmprestimosRepository,
    @Inject(PAYMENT_GATEWAY_CLIENT) private readonly gateway: PaymentGatewayClient,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly funcionarios: FuncionariosService,
    private readonly autorizacoes: AutorizacoesService,
    private readonly eConsignado: EConsignadoService,
    private readonly mutex: KeyedMutex,
  ) {}

  /**
   * POST /emprestimos. Etapas na ordem do contrato:
   *   1. funcionário existe                     -> 404
   *   2. autorização de consulta ativa          -> 403
   *   3. empresa habilitada no e-Consignado     -> 422 (Dataprev fora: 502, nada é salvo)
   *   4. score de crédito (Dataprev)            -> 502 se indisponível
   *   5-6. score / margem / limite de ativos    -> salvo como "rejeitado" (201)
   *   7. pagamento no gateway                   -> "aprovado" | "rejeitado" | "erro_processamento" (201)
   */
  async solicitar(input: SolicitarEmprestimoInput): Promise<Emprestimo> {
    const dataSolicitacao = this.clock.now();

    const funcionario = await this.funcionarios.buscarComEmpresaOuFalhar(input.funcionarioId);
    await this.autorizacoes.exigirAutorizacaoAtiva(funcionario.id);
    await this.eConsignado.garantirEmpresaHabilitada(funcionario.empresaCnpj);
    const score = await this.eConsignado.consultarScore(funcionario.cpf);

    // Margem e limite são lidos e o empréstimo é gravado sem intercalar com
    // outra solicitação do mesmo funcionário.
    return this.mutex.runExclusive(funcionario.id, async () => {
      const desfecho = await this.decidir(funcionario, input, score);

      return this.emprestimos.create({
        funcionarioId: funcionario.id,
        valorSolicitado: input.valorSolicitado,
        numeroParcelas: input.numeroParcelas,
        valorParcela: calcularValorParcela(input.valorSolicitado, input.numeroParcelas),
        parcelas: gerarParcelas(input.valorSolicitado, input.numeroParcelas, dataSolicitacao),
        createdAt: dataSolicitacao,
        ...desfecho,
      });
    });
  }

  listar(filtros: FiltrosEmprestimo): Promise<Emprestimo[]> {
    return this.emprestimos.findMany(filtros);
  }

  /** @throws NotFoundError (404) */
  async detalhar(id: string): Promise<Emprestimo> {
    const emprestimo = await this.emprestimos.findById(id);
    if (!emprestimo) throw new NotFoundError('Empréstimo não encontrado');
    return emprestimo;
  }

  private async decidir(
    funcionario: FuncionarioComEmpresa,
    input: SolicitarEmprestimoInput,
    score: number,
  ): Promise<Desfecho> {
    const ativos = await this.emprestimos.resumoAtivos(funcionario.id);
    const { margemDisponivel } = calcularMargem(funcionario.salario, ativos.somaParcelasMensais);

    const avaliacao = avaliarCredito({
      salario: funcionario.salario,
      score,
      valorSolicitado: input.valorSolicitado,
      margemDisponivel,
      quantidadeEmprestimosAtivos: ativos.quantidade,
    });
    if (!avaliacao.aprovado) {
      return { status: 'rejeitado', motivoRejeicao: avaliacao.motivo, gatewayTransacaoId: null };
    }

    const pagamento = await this.gateway.processarPagamento({
      valor: input.valorSolicitado,
      funcionarioCpf: funcionario.cpf,
    });

    switch (pagamento.status) {
      case 'aprovado':
        return { status: 'aprovado', motivoRejeicao: null, gatewayTransacaoId: pagamento.transacaoId };
      case 'recusado':
        return {
          status: 'rejeitado',
          motivoRejeicao: MOTIVOS_REJEICAO.PAGAMENTO_RECUSADO,
          gatewayTransacaoId: null,
        };
      case 'falha':
        return { status: 'erro_processamento', motivoRejeicao: null, gatewayTransacaoId: null };
    }
  }
}
