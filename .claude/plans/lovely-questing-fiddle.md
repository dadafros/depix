# Sincronizar FAQs: Single Source of Truth para Landing Page e App

## Context

Os FAQs da landing page e do app estão **dessincronizados**:

- **App FAQ**: 11 itens
- **Landing page FAQ**: 10 itens (falta "Como adicionar ou alterar meu endereço?")
- 5 itens têm conteúdo **inline duplicado** (diferente entre landing e app)
- Apenas 6 dos 11 itens usam `<template>` compartilhado

**Objetivo**: Cada item do FAQ deve existir em **um único lugar** no código (dentro de um `<template>`). A landing page e o app referenciam o mesmo template. Uma alteração no template atualiza ambos automaticamente. Zero duplicação.

## Files to modify

- `index.html` — adicionar item faltante na landing page + converter itens restantes para templates
- (CSS e JS não precisam de alteração)

## Plan

### 1. Criar templates para os 5 itens que ainda não usam template

Estes itens têm conteúdo inline (diferente entre landing e app). Converter para templates compartilhados:

| Item | Template ID | Conteúdo (usar versão do app, que é mais rica) |
|------|------------|-----------------------------------------------|
| O que é um endereço Liquid? | `tpl-faq-liquid-address` | Texto do app (linha 760) |
| Como adicionar ou alterar meu endereço? | `tpl-faq-change-address` | Texto do app (linha 764) |
| Quanto tempo leva para processar? | `tpl-faq-processing-time` | Texto do app (linha 768) |
| Quais são as taxas e limites? | `tpl-faq-fees` | Tabela formatada do app (linhas 772-780) |
| Como reportar um problema? | `tpl-faq-report` | Texto do app (linha 796) |

Adicionar estes 5 templates no bloco `<!-- Shared FAQ content templates -->` antes de `</body>`.

### 2. Adicionar item faltante na landing page

Adicionar `<details>` para "Como adicionar ou alterar meu endereço?" na landing page, entre "O que é um endereço Liquid?" e "Quanto tempo leva para processar?" (entre linhas 321-322).

### 3. Converter itens inline para usar classes de template

**Landing page** — substituir o conteúdo inline dos 5 itens por `<div>` com a classe do template:
- Linha 319: `<p itemprop="text">É o endereço...` → `<div itemprop="text" class="faq-content-liquid-address"></div>`
- (novo item): `<div itemprop="text" class="faq-content-change-address"></div>`
- Linha 326: `<p itemprop="text">As transações...` → `<div itemprop="text" class="faq-content-processing-time"></div>`
- Linha 333: `<p itemprop="text">A taxa é de 2%...` → `<div itemprop="text" class="faq-content-fees"></div>`
- Linha 361: `<p itemprop="text">Acesse o menu...` → `<div itemprop="text" class="faq-content-report"></div>`

**App FAQ** — substituir conteúdo inline dos mesmos itens por `<div>` com classe:
- Linha 760: inline `<p>` → `<div class="faq-answer hidden faq-content-liquid-address"></div>` (remover `<p>` inline)
- Linha 764: inline `<p>` → `<div class="faq-answer hidden faq-content-change-address"></div>`
- Linha 768: inline `<p>` → `<div class="faq-answer hidden faq-content-processing-time"></div>`
- Linhas 772-780: inline table → `<div class="faq-answer hidden faq-content-fees"></div>`
- Linha 796: inline `<p>` → `<div class="faq-answer hidden faq-content-report"></div>`

### 4. Registrar novos templates no script.js

Adicionar os 5 novos pares ao loop existente (linha 107-114):
```js
["tpl-faq-liquid-address", "faq-content-liquid-address"],
["tpl-faq-change-address", "faq-content-change-address"],
["tpl-faq-processing-time", "faq-content-processing-time"],
["tpl-faq-fees", "faq-content-fees"],
["tpl-faq-report", "faq-content-report"]
```

### 5. Bump service worker cache

Incrementar versão do cache em `service-worker.js`.

## Verification

1. Reiniciar preview server, limpar cache do SW
2. Verificar landing page: 11 FAQs, todos com conteúdo ao expandir
3. Verificar app FAQ: 11 FAQs, todos com conteúdo ao expandir
4. Confirmar que o conteúdo de cada item é idêntico entre landing e app
5. Verificar que os ícones SVG renderizam corretamente nos FAQs com template
6. Rodar `npm test` para garantir que nada quebrou
