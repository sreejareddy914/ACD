let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function startMutationMonitoring(onDomMutated: () => void): void {
  stopMutationMonitoring();
  if (!document.body) return;

  observer = new MutationObserver((mutations) => {
    // Ignore changes caused by ClearChoice UI itself or its element highlights
    const relevant = mutations.some(m => {
      const target = m.target as HTMLElement;
      if (!target) return false;

      // Check target element
      if (
        target.id === 'clearchoice-extension-root' ||
        target.closest?.('#clearchoice-extension-root') ||
        target.hasAttribute?.('data-clearchoice-ui') ||
        target.closest?.('[data-clearchoice-ui]') ||
        target.classList?.contains('clearchoice-highlight-overlay')
      ) {
        return false;
      }

      // Check added nodes
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i] as HTMLElement;
        if (
          node.id === 'clearchoice-extension-root' ||
          node.hasAttribute?.('data-clearchoice-ui') ||
          node.classList?.contains('clearchoice-highlight-overlay')
        ) {
          return false;
        }
      }

      return true;
    });

    if (!relevant) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce by 2 seconds to avoid flooding while user or page is typing/updating
    debounceTimer = setTimeout(() => {
      onDomMutated();
    }, 2000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-hidden', 'hidden']
  });
}

export function stopMutationMonitoring(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
