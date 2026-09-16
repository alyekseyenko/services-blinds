# Estores Rainha Pro - Design System & Ergonomic Guidelines

Este documento serve como a **Fonte Única de Verdade (Single Source of Truth)** para a identidade visual, padrões de UI e design system do ecossistema **Blinds Technical Services** (nome configurável via `NEXT_PUBLIC_APP_NAME` em produção). 
Todas as futuras alterações, novos ecrãs, componentes ou agentes de IA devem seguir estas diretrizes com rigor absoluto.

---

## 🎨 1. Paleta de Cores (Estilo iDraft)

O design baseia-se num tema escuro profundo e minimalista, intercalado com elementos translúcidos de vidro (*glassmorphism*) e realçado por um **Verde Neon/Lima de alto contraste**.

| Nome do Token | Cor Hex / Valor | Descrição | Utilização Tailwind |
| :--- | :--- | :--- | :--- |
| **Fundo Principal** | `#06080f` | Fundo preto azulado escuro ultra-premium | `bg-[#06080f]` |
| **Fundo de Cards (Dark)** | `#121620` / `#0b0f17` | Fundo de cards escuro secundário | `bg-[#121620]` / `bg-slate-950` |
| **Fundo de Cards (Light/PWA)** | `#ffffff` / `#f8fafc` | Fundo de cards limpo de alto contraste para mobile | `bg-white` / `bg-slate-50` |
| **Verde Neon (Primário)**| `#84cc16` / `#a3e635` | Verde lima vibrante (marca e destaques ativos) | `text-[#84cc16]`, `bg-[#84cc16]` |
| **Azul Ação / GPS** | `#2563eb` / `#3b82f6` | Tom de azul para navegação e ações secundárias | `text-blue-500`, `bg-blue-600` |
| **Texto de Alto Contraste** | `#090d16` / `#f8fafc` | Preto profundo (light) / Branco neve (dark) | `text-[#090d16]` / `text-white` |
| **Texto Secundário (Outdoor)**| `#475569` / `#cbd5e1` | Cinzentos de alto contraste legíveis sob luz solar | `text-slate-600` / `text-slate-300` |
| **Bordas** | `rgba(255,255,255,0.08)` / `#e2e8f0` | Contornos de cards e grelhas | `border-slate-800` / `border-slate-200` |

---

## ☀️ 2. Diretrizes de Ergonomia Mobile & Luz Solar (Outdoor Usability)

Para técnicos que utilizam a aplicação na rua, em carrinhas ou sob luz solar direta:

1. **Escala Tipográfica Mínima (Sem Micro-Textos):**
   * **Texto Mínimo:** `text-xs` (12px) — **Proibido usar `text-[8px]` ou `text-[9px]`** no mobile.
   * **Corpo de Texto:** `text-sm` (14px) ou `text-base` (16px) font-semibold/bold.
   * **Títulos e Horas:** `text-xl` a `text-2xl` `font-black`.
2. **Área de Toque Mínima de 48px (Touch Target WCAG):**
   * Todos os botões, checkboxes e links interativos no telemóvel devem ter **altura mínima de `48px` (`h-12`)** ou padding generoso (`py-3.5 px-4`), permitindo o clique com luvas de trabalho ou uma só mão.
3. **Ergonomia do Teclado (Input Modes):**
   * Campos de medição numérica (Largura, Altura, Quantidade) devem incluir sempre `inputMode="decimal"` ou `inputMode="numeric"` e `pattern="[0-9]*"`, abrindo diretamente o teclado numérico no telemóvel.
4. **Feedback Háptico Físico (Vibração):**
   * Ações críticas concluídas com sucesso (guardar medições, concluir visita, marcar peça) devem acionar `navigator.vibrate(40)` para confirmação física imediata.
5. **Ações Rápidas de 1-Toque (Quick Actions):**
   * O cartão da tarefa na agenda deve fornecer atalhos imediatos para **Chamada Telefónica** (`tel:`) e **Navegação GPS** (Google Maps / Waze) sem exigir a abertura prévia do modal.

---

## 🔮 3. Glassmorphism & Efeitos iDraft

Para criar a sensação de profundidade e elegância tridimensional do mockup *iDraft*:

* **Glassmorphism Dark**:
  * Classe CSS utilitária: `.glass-panel-dark`
  * Tailwind: `bg-slate-950/80 backdrop-blur-20 border border-slate-900/60 shadow-[0_25px_60px_rgba(0,0,0,0.6)]`
* **Glassmorphism Light**:
  * Classe CSS utilitária: `.glass-panel-light`
  * Tailwind: `bg-white/95 backdrop-blur-20 border border-white/80 shadow-sm`
* **Glow Néon**:
  * Para indicadores ativos (ex: online): `shadow-[0_0_12px_#84cc16]`
  * Para botões primários: `shadow-[0_10px_35px_rgba(132,204,22,0.25)]`

---

## 📐 4. Tipografia & Geometria

* **Cantos Arredondados Generosos (Essencial no iDraft)**:
  * Ecrã de Login/Cards Bento Principais: `rounded-[2.5rem]` ou `rounded-[2rem]`.
  * Botões de Ação e Inputs: `rounded-2xl` ou `rounded-xl`.
* **Tipografia**:
  * Títulos de Secção: Itálicos, bold pesado, tracking apertado, maiúsculas.
    * Exemplo: `text-2xl font-black text-slate-900 tracking-tighter uppercase italic`
  * Badges e Legendas:
    * Exemplo: `text-xs font-black text-slate-600 uppercase tracking-wider`

---

## 🍱 5. Estrutura de Layout Bento Grid

1. **Separação Limpa de Painéis**:
   * Utilizar grelhas harmoniosas com espaçamento regular (`gap-4` ou `gap-5`).
   * Intercalar painéis claros/escuros com botões de realce na cor primária `#84cc16`.
2. **Transições Seguras**:
   * **NÃO usar transições universais `*`** para evitar tremura (layout shaking) em redimensionamentos ou hidratação.
   * Utilizar a classe `.smooth-transition` (`transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`) apenas em elementos interativos e hovers.
