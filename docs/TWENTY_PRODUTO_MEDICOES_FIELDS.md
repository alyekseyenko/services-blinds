# Campos Twenty — objeto Produto (medições)

Campos custom criados no workspace de produção para guardar medições de forma legível no CRM.

Script idempotente (só o link de medições): [`scripts/create-twenty-produto-link-field.mjs`](../scripts/create-twenty-produto-link-field.mjs)

Executar **dentro da rede Docker** (ex.: contentor `technician-app`):

```bash
docker cp scripts/create-twenty-produto-link-field.mjs technician-app:/tmp/
docker exec technician-app node /tmp/create-twenty-produto-link-field.mjs
```

### Criar manualmente no Twenty (UI)

1. **Definições** (ícone de engrenagem) → **Modelo de dados** / **Data model**.
2. Objeto **Produto** → **Adicionar campo**.
3. Tipo **Links**; etiqueta **Ver medições na app**.
4. Nome API (camelCase): **`linkAppTecnicos`** — tem de ser exactamente este nome.
5. Guardar e, na vista de registo/tabela de Produtos, **personalizar colunas** para mostrar o novo campo.

O deploy da app **não** cria este campo; sem ele a projeção CRM falha, mas as medições ficam na BD da app.

## Campos novos (por linha `Produto`)

| Nome API (`name`) | Etiqueta no Twenty | Tipo |
|-------------------|-------------------|------|
| `divisao` | Divisão | Texto |
| `fixacao` | Fixação | Texto |
| `comandos` | Comandos | Texto |
| `material` | Material (estore exterior) | Seleção (PVC, Alumínio térmico, …) |
| `materialOutro` | Material (especificar) | Texto |
| `modelo` | Modelo | Texto |
| `ralCor` | RAL / Cor | Texto |
| `tecido` | Tecido / Rede | Texto |
| `referencia` | Referência | Texto |
| `acionamento` | Acionamento | Seleção (Manual, Motor RTS, …) |
| `observacoesProduto` | Observações do produto | Texto |
| `grupoMedicaoId` | Grupo de medição | Texto |
| `preco` | Preço | Número |

## Campos que já existiam

`produto`, `largura`, `altura`, `quantidade`, `cor`, `localizacao`, `preparado`, `estadoDoArmazem`, `servicoitemId`, `name`, etc.

## Campo de link (ficha na app)

| Nome API | Etiqueta | Tipo |
|----------|----------|------|
| `linkAppTecnicos` | Ver medições na app | Links |

A app projeta cada linha `Produto` com **nome** + **link** para `/medicoes/{sheetId}?linha={lineId}`. Detalhes das medidas vivem no Postgres da app (`MEASUREMENTS_DATABASE_URL`), não no Twenty.

## Nota histórica

Os campos de detalhe na tabela `Produto` foram usados na fase 1; a fonte de verdade passou ao bounded context de medições (ADR 013).
