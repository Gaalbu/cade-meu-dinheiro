# Arquitetura, domínio e linguagem visual

## Decisões centrais

### Supabase Auth + Prisma

Supabase Auth oferece cadastro por e-mail, confirmação, recuperação e cookies compatíveis com Server Components. Prisma concentra o modelo de domínio e evita espalhar SQL pela aplicação. A escolha também mantém o deploy do Next.js simples na Vercel.

O isolamento tem quatro camadas:

1. `supabase.auth.getUser()` valida a sessão no servidor;
2. `requireUser()` é o ponto de entrada das páginas e ações privadas;
3. toda consulta e mutação contém o UUID autenticado em `userId` e revalida entidades relacionadas;
4. RLS aplica `auth.uid() = userId` para acessos pela Data API do Supabase.

A conexão Prisma é uma conexão privilegiada de servidor, portanto as verificações de aplicação continuam obrigatórias mesmo com RLS.

### Webhook por usuário

O token tem o formato `fio_wh_` + 32 bytes aleatórios em Base64URL. Somente `HMAC-SHA256(WEBHOOK_SECRET, token)` e um preview parcial ficam no banco. O índice único em `tokenHash` localiza a conta sem aceitar `userId` no payload.

O fluxo é:

1. autenticar token ativo e não expirado;
2. validar JSON/texto e tamanho;
3. extrair valor, estabelecimento e data;
4. normalizar acentos e pontuação;
5. ordenar regras por prioridade/comprimento e buscar palavra inteira;
6. usar “Outros” quando nenhuma regra casa;
7. criar ou reutilizar a transação pelo fingerprint de idempotência;
8. atualizar `lastUsedAt`.

O endpoint aceita `text/plain` para automações móveis não quebrarem JSON quando a notificação contém aspas ou linhas. JSON continua disponível para um app Android dedicado.

## Categorização

As categorias são materializadas por usuário. Isso permite cores, nomes e regras pessoais sem compartilhar dados configuráveis entre contas. As regras iniciais cobrem termos comuns; uma correção manual pode criar uma regra de prioridade 250 para o estabelecimento normalizado.

O motor deliberadamente começa determinístico:

- é explicável (“uber” levou a Transporte);
- é barato e previsível em serverless;
- respeita imediatamente uma correção;
- não envia descrições financeiras a um modelo externo.

Um classificador probabilístico futuro deve sugerir, nunca sobrescrever regras pessoais explícitas.

## Detecção de recorrência

O MVP agrupa estabelecimentos normalizados nos últimos 120 dias e sinaliza os que aparecem em ao menos dois meses distintos. Isso é uma heurística, não uma declaração de assinatura: evita criar um modelo prematuro de recorrência antes de existir confirmação do usuário. A v2 deve persistir `RecurringExpense`, tolerar variação de valor/data e permitir ignorar falsos positivos.

## Design: livro-caixa editorial

O dinheiro é apresentado como registro, não como aplicativo bancário promocional. A referência mistura livro contábil, jornal econômico e carimbo de arquivo.

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#E9E4D6` | fundo mineral |
| `--paper-light` | `#F4F0E5` | áreas de leitura |
| `--paper-deep` | `#D8D0BD` | trilhas e separação |
| `--ink` | `#1D201C` | texto e navegação |
| `--rule` | `#AAA38F` | linhas de régua |
| `--stamp` | `#C33D2E` | ação/ênfase editorial |
| `--ledger` | `#175C54` | total principal/positivo estrutural |
| `--cobalt` | `#315D96` | foco e informação |
| `--positive` | `#166B51` | entrada/meta |
| `--negative` | `#BD382C` | estouro/erro |
| `--warning` | `#BC741D` | aproximação de limite |

### Tipografia

- **Newsreader:** títulos com contraste e cadência editorial;
- **Archivo Narrow:** navegação e texto denso com desenho estreito;
- **IBM Plex Mono:** valores, datas, tokens e rótulos técnicos.

São carregadas pelo Google Fonts e possuem fallbacks seguros. Valores usam sempre algarismos monoespaçados para comparação vertical.

### Composição

- sidebar escura fixa como lombada do livro;
- total mensal em grande campo verde, não em um card flutuante;
- seções separadas por regras horizontais e números de arquivo;
- painéis com canto chanfrado, borda seca e nenhuma sombra;
- tabelas que viram pares hierárquicos no celular;
- gráficos de linha e barra, evitando o donut genérico como visual dominante.

### Microinterações

- contagem inicial do total em 700 ms;
- barras de metas/limites animadas com easing próprio;
- deslocamento de 2 px e troca para vermelho de carimbo nas ações;
- linha ativa da navegação aparece como marca de arquivo;
- meta completa muda de papel → âmbar → verde;
- `prefers-reduced-motion` reduz todas as animações.

Todos os valores estão em `app/globals.css` como custom properties reutilizáveis.

## Riscos conhecidos e evolução

- bancos mudam o texto de notificações; registrar fixtures reais anonimizadas melhora o parser;
- conteúdo pode ser ocultado pelo Android/banco;
- alertas do MVP são visuais, não jobs assíncronos;
- `rawNotification` pede uma política de retenção configurável;
- importadores de CSV variam por banco e devem ganhar presets;
- o fuso está no perfil, mas agregações server-side ainda devem migrar para conversão explícita por timezone em escala internacional.
