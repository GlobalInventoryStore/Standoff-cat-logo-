---
name: mobile-performance
description: Otimizar performance de sites em dispositivos móveis, focando em carregamento rápido, recursos leves e métricas Core Web Vitals para iOS e Android.
example-prompt: "Crie um site mobile-first com performance otimizada: imagens otimizadas, lazy loading, CSS crítico e estratégias de caching para dispositivos móveis."
---

# Skill: mobile-performance

## Quando usar
Quando precisar criar ou auditar sites focados em dispositivos móveis (iOS e Android) com carregamento rápido, uso eficiente de recursos e boas pontuações em Core Web Vitals (LCP, FID, CLS).

## Resultado esperado
- Site que carrega em menos de 3 segundos em redes móveis
- Imagens otimizadas com formatinos modernos (WebP/AVIF)
- Lazy loading para imagens e abaixo-do-do-fold
- CSS e JavaScript minimizados e carregados assincronamente quando possível
- Fontes otimizadas com subsetting e display: swap
- Estratégias de caching para recursos estáticos
- Pontuação > 90 no Lighthouse para mobile

## Workflow

1. **Auditar o site atual**
   - Rode `lighthouse https://seu-site.com --preset=mobile --only-categories=performance`
   - Identifique os maiores gargalos (LCP, CLS, FCP)

2. **Otimizar imagens**
   - Converta para WebP/AVIF com fallback JPEG/PNG
   - Use `srcset` e `sizes` para imagens responsivas
   - Implemente `loading="lazy"` para imagens abaixo do fold
   - Use `sizes` attribute para prevenir layout shift

3. **CSS crítico**
   - Extraia CSS crítico acima-do-do-fold
   - Inline o CSS crítico no `<head>`
   - Carregue o CSS restante async ou deferred

4. **Fontes otimizadas**
   - Subset de glyphs necessários
   - Use `font-display: swap` ou `optional`
   - Carregue fonts com `preload` quando críticas

5. **Estratégias de caching**
   - Configure `Cache-Control` headers para recursos estáticos
   - Use `etag` e `last-modified` quando possível
   - Implemente service worker para caching offline basic

6. **Minify e combine**
   - Minifique CSS, JS e HTML
   - Combine arquivos quando reduzir requests
   - Use `defer` para scripts não críticos

7. **Recursos hints**
   - Use `<link rel="preconnect">` para domínios essenciais
   - Use `<link rel="preload">` para recursos críticos
   - Use `<link rel="prefetch">` para próxima página

8. **Verificar performance**
   - Rode Lighthouse novamente para confirmar melhorias
   - Teste em dispositivos reais (Chrome DevTools > Device Mode)
   - Verifique métricas: FCP < 1.8s, LCP < 2.5s, CLS < 0.1

## Verificar sucesso
- Pontuação Lighthouse Performance > 90 em mobile
- LCP (Largest Contentful Paint) < 2.5 segundos
- CLS (Cumulative Layout Shift) < 0.1
- FCP (First Contentful Paint) < 1.8 segundos
- Site testado em dispositivo móvel real (iOS e Android)
- Nenhum warning de "uses an obsolete library" ou "redirects add extra round-trips"

## Referências
- https://web.dev/performance-best-practices/
- https://web.dev/lcp/
- https://web.dev/cls/
- https://web.dev/fonts-optimization/