# Blinds Technical Services - Design System & Ergonomic Guidelines

Este documento serve como a **Fonte Única de Verdade (Single Source of Truth)** para a identidade visual, padrões de UI e design system do ecossistema **Blinds Technical Services** (nome configurável via `NEXT_PUBLIC_APP_NAME` em produção). 
Todas as futuras alterações, novos ecrãs, componentes ou agentes de IA devem seguir estas diretrizes com rigor absoluto.

---

## 🎨 1. Paleta de Cores (Brutalismo + marca)

Todo o ecossistema (login, técnico, admin, CEO, armazém, portais públicos) usa **fundo com grelha** (`.brutal-grid-bg` / `AppPageShell`), painéis chapados (`.brutal-panel`), bordas `border-border-strong` e **lima néon** (`--neon`) em navegação activa e destaques. O token de marca `--primary` (`#84cc16`) mantém-se para CTAs e marca.

| Nome do Token | Cor Hex / Valor | Descrição | Utilização Tailwind |
| :--- | :--- | :--- | :--- |
| **Fundo app (claro)** | `#ebebe8` | Tema claro por defeito (técnico) + grelha `.brutal-grid-bg` | `bg-background` |
| **Fundo app (escuro)** | `#0a0a0a` | Tema escuro | `.dark bg-background` |
| **Borda forte** | `#0a0a0a` / `#525252` dark | Contornos brutalistas | `border-border-strong` |
| **Lima bloco (néon)** | `#a3e635` | Pílulas activas, faixas marquee | `bg-neon`, `text-neon-foreground` |
| **Superfície iDraft** | `#06080f` | Fundo premium escuro (login dark) | `bg-surface-deep` (`--surface-deep`) |
| **Cards escuros** | `#121620` | Cards / inputs dark iDraft | `bg-surface-card-dark` |
| **Verde Neon (marca)** | `#84cc16` | Botões, glow, fundos de destaque | `bg-primary`, `border-primary` |
| **Verde hover** | `#a3e635` | Hover de botões primários | `hover:bg-primary-hover` |
| **Painel ink** | `#0a0a0a` / `#1c1c1c` dark | Barras pretas que não invertem com o tema | `bg-ink`, `text-ink-foreground` |
| **Scrim** | preto ~72% opaco | Fundos de modal/drawer | `bg-scrim` |
| **Borda subtil** | `#d4d4cf` / `#2e2e2e` dark | Linhas finas | `border-border` |
| **Verde texto (claro)** | `#3f6212` | Texto/ícones lima em fundo claro (≥4.5:1) | `text-primary-ink` |
| **Verde texto (dark)** | `#a3e635` | Texto lima em fundo escuro | `.dark text-primary-ink` |
| **Azul Ação / GPS** | `#2563eb` / `#3b82f6` | Navegação secundária | `text-blue-500`, `bg-blue-600` |
| **Texto principal** | `#171717` / `#fafafa` | Corpo | `text-foreground` |
| **Texto secundário** | `#737373` / `#a3a3a3` | Legendas outdoor | `text-muted-foreground` |

**Implementação:** toda a paleta e receitas visuais vivem **apenas** em [`src/styles/design-system.css`](src/styles/design-system.css) (importado por `globals.css`). Classes utilitárias `ds-*` e tokens Tailwind (`bg-success-surface`, `text-danger-fg`, …) derivam daí. Não adicionar hex nem `bg-red-*` / `text-slate-*` em componentes — o ESLint bloqueia.

**Superfícies:** rotas de **técnico e login** = PWA claro por defeito + iDraft no dark; **admin/CEO** = neutros Twenty com o mesmo lima de marca.

---

## ☀️ 2. Diretrizes de Ergonomia Mobile & Luz Solar (Outdoor Usability)

Para técnicos que utilizam a aplicação na rua, em carrinhas ou sob luz solar direta:

1. **Escala Tipográfica Mínima (Sem Micro-Textos):**
   * **Texto Mínimo:** `text-xs` (12px) — **Proibido usar `text-[8px]` ou `text-[9px]`** no mobile.
   * **Corpo de Texto:** `text-sm` (14px) ou `text-base` (16px) font-semibold/bold.
   * **Títulos e Horas:** `text-xl` a `text-2xl` `font-black`.
2. **Área de Toque Mínima de 48px (Touch Target WCAG):**
   * No **mobile**, botões e controlos interativos: **`min-h-12` (48px)** e **`gap-2` (8px)** entre alvos adjacentes.
   * Densidade menor (`min-h-10`) só com prefixo **`md:`** (desktop admin).
3. **Tema claro por defeito** nas rotas do técnico (`resolveInitialTheme` → `"light"` se não houver preferência guardada).
4. **Ergonomia do Teclado (Input Modes):**
   * Campos de medição numérica (Largura, Altura, Quantidade) devem incluir sempre `inputMode="decimal"` ou `inputMode="numeric"` e `pattern="[0-9]*"`, abrindo diretamente o teclado numérico no telemóvel.
5. **Feedback (visual primeiro, háptico opcional):**
   * Toasts obrigatórios para sucesso/erro/offline. Haptics via `@/lib/haptics` (Android); **iOS não suporta `vibrate`** — não depender só da vibração.
   * Distinguir **"guardado no telemóvel"** vs **"enviado ao CRM"** nas medições e fila de sync.
   * Header do técnico: chip de estado (**Offline**, **A sincronizar**, **N por enviar**, **Erro**) com texto, não só cor.
6. **Ações Rápidas de 1-Toque (Quick Actions):**
   * O cartão da tarefa na agenda deve fornecer atalhos imediatos para **Chamada Telefónica** (`tel:`) e **Navegação GPS** (Google Maps / Waze) sem exigir a abertura prévia do modal.

---

## 🔮 3. Superfícies chapadas & decoração brutalista

* **Painéis** (`.glass-panel`, `.glass-panel-light`, `.glass-panel-dark`): superfícies **sólidas** com `border-border-strong` — sem blur.
* **Grelha de fundo**: `.brutal-grid-bg` ou [`AppPageShell`](src/components/ui/AppPageShell.tsx) (`grid={true}`) em todas as rotas autenticadas e portais.
* **Painel reutilizável**: `.brutal-panel` / componente `BrutalPanel`.
* **Separador tipo bilhete**: `.ticket-divider` entre secções de cartões.
* **Faixa marquee**: componente `Marquee` + utilitários `.brutal-marquee` em estados vazios ou login.
* **Títulos display**: receita `ds-title` (Michroma, peso 400, maiúsculas, sem itálico) via `DisplayHeading` e títulos de ecrã — corpo continua Inter.

---

## 📐 4. Tipografia & Geometria

### Regra de fontes (dois níveis)

| Uso | Receita / token | Notas |
| :--- | :--- | :--- |
| **Títulos** (h1/h2, cabeçalhos de painel, diálogo, folha, cartão de visita) | `ds-title` + escala (`text-display-*`, `text-base`…) | Nunca `font-black` nem `italic` em Michroma |
| **Corpo, botões, rótulos** | `font-sans` (herdado do `body`) | `font-semibold` / `font-bold` quando precisar de ênfase |
| **Números, telefones, NSI, horas** | `ds-num` | Inter com `tabular-nums` — não usar `font-mono` |
| **Mapa / guia / calendário** | Overrides em `globals.css` + `MAP_SVG_FONT_FAMILY` nos pins | Inter Variable alinhada à app |


* **Geometria**:
  * Cards e painéis: `rounded-2xl` + `border-2 border-border-strong`.
  * Botões e inputs: `rounded-xl`.
  * Bottom nav técnico: barra preta, item activo em pílula `bg-neon`.
* **Tipografia**:
  * Títulos curtos: `ds-title` (`DisplayHeading`, `Dialog`, `Sheet`, headers de rota).
  * Corpo e labels: Inter, `font-semibold` / `font-bold`, maiúsculas em chips.
  * Dados numéricos: `ds-num`.
  * Badges e Legendas:
    * Exemplo: `text-xs font-black text-slate-600 uppercase tracking-wider`

---

## 📱 5. Breakpoints por dispositivo

| Faixa | Largura | Uso |
| :--- | :--- | :--- |
| **Telemóvel** | &lt; 640px (`sm`) | PWA técnico, portais — uma coluna, alvos 48px |
| **Tablet vertical** | 768–1023px (`md`–`lg`) | Lista técnico em 2 colunas a partir de `md`; drawer lateral a partir de `md` |
| **Tablet horizontal / portátil** | 1024–1279px (`lg`–`xl`) | Admin: sidebars; mapa com filtros recolhíveis |
| **PC** | ≥ 1280px (`xl`) | Grelhas CEO/armazém completas |

Telemóvel em **landscape** com pouca altura: header e bottom nav compactos (`max-md:landscape`).

---

## 🍱 6. Estrutura de Layout Bento Grid

1. **Separação Limpa de Painéis**:
   * Utilizar grelhas harmoniosas com espaçamento regular (`gap-4` ou `gap-5`).
   * Intercalar painéis claros/escuros com botões de realce na cor primária `#84cc16`.
2. **Transições Seguras**:
   * **NÃO usar transições universais `*`** para evitar tremura (layout shaking) em redimensionamentos ou hidratação.
   * Utilizar a classe `.smooth-transition` (`transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`) apenas em elementos interativos e hovers.

---

## 7. Estados e acessibilidade

* **Nunca comunicar estado só por cor** — incluir texto ou ícone (ex.: legenda do mapa, chip de sync, badges com rótulo).
* **Contraste:** em fundo claro, ícones/texto de marca usam `text-primary-ink` (`#4d7c0f`), não `#84cc16`.

---

## 8. Prevenção (CI / lint)

* ESLint bloqueia `text-[8–11px]`, hex legacy, `bg-white`, `text-slate-7/8/9`, `bg-slate-50/100` e `bg/text-[#…]` em componentes e páginas (excepção: arte de marcadores do mapa).
* `npm run validate` — type-check + Vitest, incluindo `designTokens.contrast.test.ts` (pares WCAG claro/escuro).
* Smoke e2e inclui `e2e/a11y-public.spec.ts` (contraste axe nas páginas públicas).
