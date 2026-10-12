-- Tipos
CREATE TYPE "status_emprestimo" AS ENUM ('aprovado', 'rejeitado', 'erro_processamento');

-- Unicidade global de CPF / CNPJ / e-mail entre empresas e funcionários
CREATE TABLE "identificadores_unicos" (
    "tipo"  VARCHAR(5)   NOT NULL,
    "valor" VARCHAR(255) NOT NULL,
    CONSTRAINT "identificadores_unicos_pkey" PRIMARY KEY ("tipo", "valor"),
    CONSTRAINT "identificadores_unicos_tipo_check" CHECK ("tipo" IN ('cpf', 'cnpj', 'email'))
);

CREATE TABLE "empresas" (
    "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
    "cnpj"               CHAR(14)     NOT NULL,
    "razao_social"       VARCHAR(255) NOT NULL,
    "nome_representante" VARCHAR(255) NOT NULL,
    "cpf_representante"  CHAR(11)     NOT NULL,
    "email"              VARCHAR(255) NOT NULL,
    "senha_hash"         VARCHAR(255) NOT NULL,
    "created_at"         TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "empresas_cnpj_check" CHECK ("cnpj" ~ '^[0-9]{14}$'),
    CONSTRAINT "empresas_cpf_representante_check" CHECK ("cpf_representante" ~ '^[0-9]{11}$')
);
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");
CREATE UNIQUE INDEX "empresas_cpf_representante_key" ON "empresas"("cpf_representante");
CREATE UNIQUE INDEX "empresas_email_key" ON "empresas"("email");

CREATE TABLE "funcionarios" (
    "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id"    UUID          NOT NULL,
    "nome_completo" VARCHAR(255)  NOT NULL,
    "cpf"           CHAR(11)      NOT NULL,
    "email"         VARCHAR(255)  NOT NULL,
    "senha_hash"    VARCHAR(255)  NOT NULL,
    "salario"       DECIMAL(12,2) NOT NULL,
    "created_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "funcionarios_cpf_check" CHECK ("cpf" ~ '^[0-9]{11}$'),
    CONSTRAINT "funcionarios_salario_check" CHECK ("salario" > 0)
);
CREATE UNIQUE INDEX "funcionarios_cpf_key" ON "funcionarios"("cpf");
CREATE UNIQUE INDEX "funcionarios_email_key" ON "funcionarios"("email");
CREATE INDEX "idx_funcionarios_empresa" ON "funcionarios"("empresa_id");

CREATE TABLE "autorizacoes_consulta" (
    "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
    "funcionario_id" UUID           NOT NULL,
    "autorizado_em"  TIMESTAMPTZ(3) NOT NULL,
    "expira_em"      TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "autorizacoes_consulta_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "autorizacoes_consulta_janela_check" CHECK ("expira_em" > "autorizado_em")
);
CREATE INDEX "idx_autorizacoes_func_expira" ON "autorizacoes_consulta"("funcionario_id", "expira_em" DESC);

CREATE TABLE "emprestimos" (
    "id"                   UUID                NOT NULL DEFAULT gen_random_uuid(),
    "funcionario_id"       UUID                NOT NULL,
    "valor_solicitado"     DECIMAL(12,2)       NOT NULL,
    "numero_parcelas"      SMALLINT            NOT NULL,
    "valor_parcela"        DECIMAL(12,2)       NOT NULL,
    "status"               "status_emprestimo" NOT NULL,
    "motivo_rejeicao"      TEXT,
    "gateway_transacao_id" VARCHAR(100),
    "created_at"           TIMESTAMPTZ(3)      NOT NULL,
    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "emprestimos_valor_solicitado_check" CHECK ("valor_solicitado" > 0),
    CONSTRAINT "emprestimos_numero_parcelas_check" CHECK ("numero_parcelas" BETWEEN 1 AND 4),
    CONSTRAINT "emprestimos_valor_parcela_check" CHECK ("valor_parcela" > 0),
    CONSTRAINT "emprestimos_motivo_rejeicao_check" CHECK ("status" <> 'rejeitado' OR "motivo_rejeicao" IS NOT NULL)
);
CREATE INDEX "idx_emprestimos_func_status" ON "emprestimos"("funcionario_id", "status");
CREATE INDEX "idx_emprestimos_status" ON "emprestimos"("status");

CREATE TABLE "parcelas_emprestimo" (
    "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
    "emprestimo_id"   UUID          NOT NULL,
    "numero"          SMALLINT      NOT NULL,
    "valor"           DECIMAL(12,2) NOT NULL,
    "data_vencimento" DATE          NOT NULL,
    CONSTRAINT "parcelas_emprestimo_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "parcelas_emprestimo_numero_check" CHECK ("numero" BETWEEN 1 AND 4)
);
CREATE UNIQUE INDEX "parcelas_emprestimo_emprestimo_id_numero_key" ON "parcelas_emprestimo"("emprestimo_id", "numero");

-- Chaves estrangeiras
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_empresa_id_fkey"
    FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "autorizacoes_consulta" ADD CONSTRAINT "autorizacoes_consulta_funcionario_id_fkey"
    FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_funcionario_id_fkey"
    FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parcelas_emprestimo" ADD CONSTRAINT "parcelas_emprestimo_emprestimo_id_fkey"
    FOREIGN KEY ("emprestimo_id") REFERENCES "emprestimos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
