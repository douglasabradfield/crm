import { useCallback, useSyncExternalStore } from 'react';

/**
 * Casa uma media query e re-renderiza quando ela muda. As strings usadas no app
 * batem com os breakpoints do Tailwind (sm 640 / md 768 / lg 1024) para não
 * inventar um segundo conjunto de pontos de quebra.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Abaixo do breakpoint md do Tailwind — o "celular" do projeto.
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

// Faixa do tablet (md, abaixo de lg).
export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}
