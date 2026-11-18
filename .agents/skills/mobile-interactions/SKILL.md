---
name: mobile-interactions
description: Criar interações fluidas e otimizadas para dispositivos móveis, incluindo touch events, animações performáticas e gestos nativos (swipe, drag, tap).
example-prompt: "Crie um carousel responsivo com navegação por swipe, botões de ação com hover tap, e menu lateral que anima o ícone hambúrguer para 'X' em dispositivos móveis."
---

# Skill: mobile-interactions

## Quando usar
Quando precisar criar interações em sites mobile-first que envolvam touch events, animações performáticas e gestos nativos (swipe, drag, tap). Aplicável a carousels, menus, modais, formulários e qualquer componente que receba input do usuário em dispositivos touch.

## Resultado esperado
- Interações responsivas que funcionam com touch, mouse e keyboard
- Animações que mantêm 60fps em dispositivos móveis (usando transform/opacity em vez de width/height)
- Gestos naturais: swipe horizontal/vertical, drag and drop, tap com feedback visual
- Nenhum jank ou delay na resposta ao touch
- Compatibilidade com iOS (Safari) e Android (Chrome)
- Accessibility mantida (a11y labels, focus management)

## Workflow

1. **Detectar tipo de dispositivo**
   - Use `navigator.maxTouchPoints` ou `window.matchMedia('(pointer: touch)')`
   - Aplique classes diferentes para touch vs mouse inputs
   - Não rely apenas em `ontouchstart` — use feature detection

2. **Gestos Swipe**
   - Detecte `pointerdown`, `pointermove`, `pointerup`
   - Calcule distância deltaX/deltaY
   - Minimum swipe distance: 30-50px para evitar clicks acidentais
   - Use `passive: { passive: false }` no event listener quando precisar cancelar scroll

3. **Animações performáticas**
   - Use apenas `transform` e `opacity` para animações
   - Evite `width`, `height`, `top`, `left`, `margin` que causam reflow/repaint
   - Use `will-change: transform` para elementos animados
   - Animações complexas: use CSS `@keyframes` ou GSAP com `transformOrigin`

4. **Touch feedback**
   - Adicione `transform: scale(0.95)` em `pointerdown`, restore em `pointerup`
   - Use `active` state styling: `[data-pressed]` ou `.is-pressed`
   - Feedback haptic quando suportado: `navigator.hapticFeedback`

5. **Gestos Drag & Drop**
   - Track mouse/touch position durante drag
   - Mostre preview visual do item sendo arrastado
   - Soltar com `drop` event — prevenha default do navegador
   - Restore estado após drop completes

6. **Tap vs Click**
   - Use `pointerdown` + `pointerup` no mesmo elemento
   - Timeout máximo 300ms entre down e up para registrar tap
   - Evite duplo-tap-to-zoom bloqueando `viewport-metatag` e usando `touch-action: manipulation`

7. **Prevenir scroll conflict**
   - Quando elemento é arrastável/swipeable, use `event.preventDefault()` no `pointermove` quando delta > threshold
   - Use `touch-action: none` no container filho interativo
   - Mantenha scroll funcional em áreas não-interativas

8. **Verificar em dispositivos reais**
   - Teste no Chrome DevTools > Device Mode (iPhone, Android)
   - Teste em dispositivos físicos: iPhone SE, iPhone 15, Samsung Galaxy
   - Verifique zooming accidental e scroll jitter

## Verificar sucesso
- [ ] Swipe funciona suavemente em 30+ms resposta
- [ ] Animações mantêm 60fps no Chrome DevTools > FPS Meter
- [ ] Tap registra entre 200-400ms (não 300ms legacy)
- [ ] Drag & drop funciona sem quebra de layout
- [ ] Nenhum evento `touchend` duplicado ou conflicts com click
- [ ] Funciona em iOS Safari e Android Chrome
- [ ] Accessibility: focus permanece visível após interações
- [ ] `preventDefault()` chamado apenas quando necessário

## Referências
- https://developer.mozilla.org/en-US/docs/Web/Touch_events
- https://web.dev/touch-events/
- https://css-tricks.com/pointerevents/
- https://developer.apple.com/human-interface-guidelines/ios/touch/
- https://developer.android.com/guide/topics/ui/pointer-events
- https://gsap.com/docs/v3/GSAP/AnimationLifecycle/