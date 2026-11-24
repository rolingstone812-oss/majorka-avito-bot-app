(() => {
  'use strict';

  /**
   * Поиск и фильтрация вопросов в разделе FAQ.
   */
  const initFaqExplorer = () => {
    const faqItems = Array.from(
      document.querySelectorAll('.faq-item[data-category]')
    );
    if (!faqItems.length) {
      return;
    }

    const searchInput = document.getElementById('faq-search');
    const filterButtons = Array.from(
      document.querySelectorAll('.faq-filter-btn[data-category]')
    );
    const countEl = document.getElementById('faq-count');
    const emptyEl = document.getElementById('faq-empty');
    const toggleAllBtn = document.getElementById('faq-toggle-all');
    const resetBtn = document.getElementById('faq-reset-btn');

    const indexedItems = faqItems.map((item) => {
      const detail =
        item.tagName === 'DETAILS' ? item : item.querySelector('details');
      const normalizedText = (item.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      const rawCategory = (item.dataset.category || '').trim().toLowerCase();

      return {
        item,
        detail,
        normalizedText,
        categories: rawCategory ? rawCategory.split(/\s+/) : [],
        rawCategory
      };
    });

    let activeCategory = 'all';
    const initiallyActiveBtn = filterButtons.find(
      (btn) =>
        btn.getAttribute('aria-pressed') === 'true' ||
        btn.classList.contains('is-active')
    );
    if (initiallyActiveBtn && initiallyActiveBtn.dataset.category) {
      activeCategory = initiallyActiveBtn.dataset.category.trim().toLowerCase();
    }

    const syncFilterButtons = () => {
      filterButtons.forEach((btn) => {
        const btnCategory = (btn.dataset.category || 'all').trim().toLowerCase();
        const isActive = btnCategory === activeCategory;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.classList.toggle('is-active', isActive);
      });
    };

    const getVisibleDetails = () =>
      indexedItems
        .filter((entry) => !entry.item.hidden && entry.detail)
        .map((entry) => entry.detail);

    const syncToggleAllButton = () => {
      if (!toggleAllBtn) {
        return;
      }

      const visibleDetails = getVisibleDetails();
      const allExpanded =
        visibleDetails.length > 0 &&
        visibleDetails.every((detail) => detail.open);

      toggleAllBtn.textContent = allExpanded ? 'Свернуть все' : 'Развернуть все';
      toggleAllBtn.setAttribute('aria-expanded', allExpanded ? 'true' : 'false');
      toggleAllBtn.disabled = visibleDetails.length === 0;
    };

    const applyFilter = () => {
      const query = searchInput
        ? searchInput.value.trim().replace(/\s+/g, ' ').toLowerCase()
        : '';

      let visibleCount = 0;

      indexedItems.forEach((entry) => {
        const matchesCategory =
          activeCategory === 'all' ||
          entry.rawCategory === activeCategory ||
          entry.categories.includes(activeCategory);
        const matchesQuery =
          query === '' || entry.normalizedText.includes(query);
        const isVisible = matchesCategory && matchesQuery;

        entry.item.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
        }
      });

      if (countEl) {
        countEl.textContent =
          'Показано вопросов: ' + visibleCount + ' из ' + indexedItems.length;
      }

      if (emptyEl) {
        emptyEl.hidden = visibleCount > 0;
      }

      syncToggleAllButton();
    };

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
      searchInput.addEventListener('search', applyFilter);
    }

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = (btn.dataset.category || 'all').trim().toLowerCase();
        syncFilterButtons();
        applyFilter();
      });
    });

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        const visibleDetails = getVisibleDetails();
        if (!visibleDetails.length) {
          return;
        }

        const shouldExpand = !visibleDetails.every((detail) => detail.open);
        visibleDetails.forEach((detail) => {
          detail.open = shouldExpand;
        });
        syncToggleAllButton();
      });
    }

    indexedItems.forEach((entry) => {
      if (entry.detail) {
        entry.detail.addEventListener('toggle', syncToggleAllButton);
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
        }
        activeCategory = 'all';
        syncFilterButtons();
        applyFilter();

        if (searchInput && emptyEl && emptyEl.contains(resetBtn)) {
          searchInput.focus();
        }
      });
    }

    syncFilterButtons();
    applyFilter();
  };

  /**
   * Просмотр скриншотов инструкции в крупном окне (<dialog id="image-lightbox">).
   */
  const initImageLightbox = () => {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const zoomButtons = Array.from(document.querySelectorAll('.guide-zoom-btn'));

    if (!lightbox || !lightboxImg || !zoomButtons.length) {
      return;
    }

    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    const closeLightbox = () => {
      if (typeof lightbox.close === 'function') {
        if (lightbox.open) {
          lightbox.close();
        }
      } else {
        lightbox.removeAttribute('open');
      }
    };

    zoomButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const innerImg = btn.querySelector('img');
        const fullSrc = (
          btn.dataset.fullSrc ||
          (innerImg
            ? innerImg.dataset.fullSrc || innerImg.getAttribute('src') || ''
            : '')
        ).trim();

        if (!fullSrc) {
          return;
        }

        try {
          const parsedUrl = new URL(fullSrc, window.location.href);
          if (
            parsedUrl.origin !== window.location.origin ||
            !/^https?:$/i.test(parsedUrl.protocol)
          ) {
            return;
          }
        } catch {
          return;
        }

        const caption =
          btn.dataset.caption ||
          (innerImg
            ? innerImg.dataset.caption || innerImg.getAttribute('alt') || ''
            : '') ||
          btn.getAttribute('aria-label') ||
          '';

        const altText =
          (innerImg && innerImg.getAttribute('alt')) ||
          caption ||
          'Скриншот инструкции';

        lightboxImg.src = fullSrc;
        lightboxImg.alt = altText;

        const imgWidth = innerImg && innerImg.getAttribute('width');
        const imgHeight = innerImg && innerImg.getAttribute('height');
        if (imgWidth && imgHeight) {
          lightboxImg.setAttribute('width', imgWidth);
          lightboxImg.setAttribute('height', imgHeight);
        } else {
          lightboxImg.removeAttribute('width');
          lightboxImg.removeAttribute('height');
        }

        if (lightboxCaption) {
          lightboxCaption.textContent = caption;
        }

        if (typeof lightbox.showModal === 'function') {
          if (!lightbox.open) {
            lightbox.showModal();
          }
        } else {
          lightbox.setAttribute('open', '');
        }
      });
    });

    if (lightboxClose) {
      lightboxClose.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  };

  /**
   * Счётчик чек-листа готовности перед отправкой ссылки.
   */
  const initGuideChecklist = () => {
    const checklist = document.getElementById('guide-checklist');
    if (!checklist) {
      return;
    }

    const statusEl = document.getElementById('checklist-status');

    const getCheckboxes = () =>
      Array.from(checklist.querySelectorAll('.check-input')).filter(
        (el) => el instanceof HTMLInputElement && el.type === 'checkbox'
      );

    const updateStatus = () => {
      const checkboxes = getCheckboxes();
      const total = checkboxes.length;
      if (!total) {
        return;
      }

      const completed = checkboxes.filter((checkbox) => checkbox.checked).length;
      const isReady = completed === total;

      if (statusEl) {
        statusEl.textContent = 'Готовность: ' + completed + ' из ' + total;
        statusEl.classList.toggle('is-ready', isReady);
      }

      checklist.classList.toggle('is-ready', isReady);
    };

    checklist.addEventListener('change', (event) => {
      if (
        event.target instanceof Element &&
        event.target.classList.contains('check-input')
      ) {
        updateStatus();
      }
    });

    window.addEventListener('pageshow', updateStatus);
    updateStatus();
  };

  /**
   * Копирование текста по кнопке (.copy-btn[data-copy-text]).
   */
  const initCopyButtons = () => {
    const copyButtons = Array.from(
      document.querySelectorAll('.copy-btn[data-copy-text]')
    );
    if (!copyButtons.length) {
      return;
    }

    const originalLabels = new WeakMap();
    const resetTimers = new WeakMap();

    const copyToClipboard = async (text) => {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // Резервный способ ниже.
        }
      }

      const helperField = document.createElement('textarea');
      helperField.value = text;
      helperField.setAttribute('readonly', '');
      helperField.style.position = 'fixed';
      helperField.style.top = '0';
      helperField.style.left = '0';
      helperField.style.opacity = '0';
      helperField.style.pointerEvents = 'none';
      document.body.appendChild(helperField);
      helperField.focus({ preventScroll: true });
      helperField.select();
      helperField.setSelectionRange(0, text.length);

      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }

      helperField.remove();
      return copied;
    };

    copyButtons.forEach((btn) => {
      originalLabels.set(btn, btn.textContent || '');

      btn.addEventListener('click', async () => {
        const textToCopy = btn.dataset.copyText || '';
        if (!textToCopy) {
          return;
        }

        const originalLabel = originalLabels.get(btn) || '';
        const copied = await copyToClipboard(textToCopy);
        if (!copied) {
          return;
        }

        const existingTimer = resetTimers.get(btn);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        btn.textContent = 'Скопировано';
        btn.classList.add('is-copied');

        const timerId = window.setTimeout(() => {
          btn.textContent = originalLabel;
          btn.classList.remove('is-copied');
          resetTimers.delete(btn);
        }, 1800);

        resetTimers.set(btn, timerId);
      });
    });
  };

  const init = () => {
    initFaqExplorer();
    initImageLightbox();
    initGuideChecklist();
    initCopyButtons();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
