// Configure aqui o endpoint protegido que fornece publicações reais do Instagram.
// Tokens, senhas e credenciais nunca devem ser adicionados a este arquivo público.
const INSTAGRAM_FEED_ENDPOINT = "";
const INSTAGRAM_AUTOPLAY_DELAY = 3500;
const PEOPLE_SLIDER_DELAY = 3500;

/*
============================================================
JS_IMAGENS_INSTITUCIONAIS
FINALIDADE: controlar o carregamento das imagens institucionais e preservar o
placeholder visual quando um arquivo ainda não existe ou não pode ser carregado.
SELETORES: .institutional-image e .hero-background-image localizam as imagens;
[data-image-container] identifica preferencialmente o contêiner de cada uma.
COMO FUNCIONA: handleLoad adiciona os estados is-image-loaded e has-image;
handleError aplica is-image-missing, remove estados de sucesso e registra aviso
no console. Os eventos load/error tratam respostas futuras, enquanto complete e
naturalWidth também reconhecem imagens que já terminaram de carregar pelo cache.
COMO ALTERAR: inclua uma nova classe no querySelectorAll apenas se a imagem usar
os mesmos estados visuais previstos no CSS.
CUIDADOS: mantenha o fallback de erro e não use esta rotina para esconder
publicações ou simular conteúdo inexistente.
DEPENDÊNCIAS: CSS_IMAGENS_INSTITUCIONAIS e atributos data-image-container no HTML.
============================================================
*/
/* Mantém os placeholders quando uma fotografia institucional ainda não existe. */
const initializeInstitutionalImages = () => {
  document.querySelectorAll('.institutional-image, .hero-background-image').forEach((image) => {
    const container = image.closest('[data-image-container]') || image.parentElement;

    if (!container) return;

    const handleLoad = () => {
      image.classList.add('is-image-loaded');
      image.classList.remove('is-image-missing');
      container.classList.add('has-image');
      container.classList.remove('is-image-missing');
    };

    const handleError = () => {
      image.classList.remove('is-image-loaded');
      image.classList.add('is-image-missing');
      container.classList.remove('has-image');
      container.classList.add('is-image-missing');
      console.warn(`Imagem institucional não carregada: ${image.id || image.currentSrc || image.src}`);
    };

    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });

    if (image.complete) {
      image.naturalWidth > 0 ? handleLoad() : handleError();
    }
  });
};

/* Executa a preparação das imagens assim que este arquivo é interpretado. */
initializeInstitutionalImages();

/* Controla a reprodução do vídeo da seção Quem é João conforme sua visibilidade. */
const initializeSectionAutoplayVideo = () => {
  const video = document.querySelector('[data-section-autoplay-video]');

  if (!video || video.dataset.sectionAutoplayInitialized === 'true') return;

  video.dataset.sectionAutoplayInitialized = 'true';
  let isActive = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.45 && !isActive) {
        isActive = true;
        video.pause();
        video.currentTime = 0;
        video.muted = true;

        const playPromise = video.play();

        if (playPromise) {
          playPromise.catch(() => {});
        }

        return;
      }

      if (!entry.isIntersecting && isActive) {
        isActive = false;
        video.pause();
        video.currentTime = 0;
      }
    });
  }, {
    threshold: [0, 0.45],
  });

  observer.observe(video);
};

initializeSectionAutoplayVideo();

/* Controla exclusivamente o carrossel do card Presença com as pessoas. */
const initializePeopleSlider = () => {
  const slider = document.querySelector('[data-people-slider]');

  if (!slider || slider.dataset.peopleSliderInitialized === 'true') return;

  const track = slider.querySelector('.people-slider-track');
  const slides = track ? Array.from(track.querySelectorAll('.people-slider-slide')) : [];
  const foregroundImages = track ? Array.from(track.querySelectorAll('.people-slider-image')) : [];
  const card = slider.closest('.gallery-wide');

  if (!track || slides.length === 0) return;

  slider.dataset.peopleSliderInitialized = 'true';
  slider.scrollLeft = 0;

  const markImagesAvailable = () => {
    if (card) card.classList.add('has-people-images');
  };

  foregroundImages.forEach((image) => {
    image.addEventListener('load', markImagesAvailable, { once: true });

    if (image.complete && image.naturalWidth > 0) markImagesAvailable();
  });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (slides.length <= 1 || prefersReducedMotion.matches) return;

  let intervalId = null;
  let resumeTimeoutId = null;
  let isHovered = false;
  let isPointerActive = false;

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    if (resumeTimeoutId !== null) {
      window.clearTimeout(resumeTimeoutId);
      resumeTimeoutId = null;
    }
  };

  const getCurrentIndex = () => {
    if (slider.clientWidth === 0) return 0;
    return Math.min(slides.length - 1, Math.round(slider.scrollLeft / slider.clientWidth));
  };

  const advance = () => {
    const nextIndex = (getCurrentIndex() + 1) % slides.length;
    slider.scrollTo({
      left: nextIndex * slider.clientWidth,
      behavior: 'smooth',
    });
  };

  const start = () => {
    if (intervalId !== null || isHovered || isPointerActive || document.hidden) return;
    intervalId = window.setInterval(advance, PEOPLE_SLIDER_DELAY);
  };

  const resume = () => {
    stop();
    resumeTimeoutId = window.setTimeout(() => {
      resumeTimeoutId = null;
      start();
    }, 800);
  };

  const interactionTarget = card || slider;

  interactionTarget.addEventListener('mouseenter', () => {
    isHovered = true;
    stop();
  });

  interactionTarget.addEventListener('mouseleave', () => {
    isHovered = false;
    resume();
  });

  interactionTarget.addEventListener('pointerdown', () => {
    isPointerActive = true;
    stop();
  });

  interactionTarget.addEventListener('pointerup', () => {
    isPointerActive = false;
    resume();
  });

  interactionTarget.addEventListener('pointercancel', () => {
    isPointerActive = false;
    resume();
  });

  start();
};

initializePeopleSlider();

/*
============================================================
JS_INSTAGRAM_AUTOPLAY
FINALIDADE: avançar horizontalmente pelo feed a cada 3,5 segundos.
COMO ALTERAR: ajuste INSTAGRAM_AUTOPLAY_DELAY no início deste arquivo.
CUIDADOS: mantém somente um intervalo ativo, pausa durante interações e fica
estático quando prefers-reduced-motion estiver habilitado.
============================================================
*/
const initializeInstagramAutoplay = () => {
  const track = document.querySelector('[data-instagram-feed-track]');

  if (!track || track.dataset.instagramAutoplayInitialized === 'true') return;

  const cards = Array.from(track.querySelectorAll('.instagram-feed-post'));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (cards.length <= 1 || prefersReducedMotion.matches) {
    track.dataset.instagramAutoplayInitialized = 'true';
    return;
  }

  track.dataset.instagramAutoplayInitialized = 'true';
  let intervalId = null;
  let resumeTimeoutId = null;
  let isHovered = false;
  let isPointerActive = false;

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    if (resumeTimeoutId !== null) {
      window.clearTimeout(resumeTimeoutId);
      resumeTimeoutId = null;
    }
  };

  const getCurrentIndex = () => cards.reduce((closestIndex, card, index) => {
    const currentDistance = Math.abs(card.offsetLeft - track.scrollLeft);
    const closestDistance = Math.abs(cards[closestIndex].offsetLeft - track.scrollLeft);
    return currentDistance < closestDistance ? index : closestIndex;
  }, 0);

  const advance = () => {
    const nextIndex = (getCurrentIndex() + 1) % cards.length;
    track.scrollTo({
      left: cards[nextIndex].offsetLeft,
      behavior: 'smooth',
    });
  };

  const start = () => {
    if (intervalId !== null || isHovered || isPointerActive || document.hidden) return;
    intervalId = window.setInterval(advance, INSTAGRAM_AUTOPLAY_DELAY);
  };

  const resumeAfterInteraction = () => {
    stop();
    resumeTimeoutId = window.setTimeout(() => {
      resumeTimeoutId = null;
      start();
    }, 1000);
  };

  track.addEventListener('mouseenter', () => {
    isHovered = true;
    stop();
  });

  track.addEventListener('mouseleave', () => {
    isHovered = false;
    resumeAfterInteraction();
  });

  track.addEventListener('pointerdown', () => {
    isPointerActive = true;
    stop();
  });

  track.addEventListener('pointerup', () => {
    isPointerActive = false;
    resumeAfterInteraction();
  });

  track.addEventListener('pointercancel', () => {
    isPointerActive = false;
    resumeAfterInteraction();
  });

  track.addEventListener('keydown', stop);
  track.addEventListener('keyup', resumeAfterInteraction);
  track.addEventListener('focusin', stop);
  track.addEventListener('focusout', resumeAfterInteraction);

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : resumeAfterInteraction();
  });

  start();
};

/* Consome somente um endpoint oficial/protegido e nunca cria publicações falsas. */
const initializeInstagramFeed = async () => {
  const feed = document.querySelector('[data-instagram-feed]');

  if (!feed || feed.dataset.instagramFeedInitialized === 'true') return;

  feed.dataset.instagramFeedInitialized = 'true';
  const track = feed.querySelector('[data-instagram-feed-track]');
  const loadingState = feed.querySelector('[data-instagram-feed-loading]');
  const emptyState = feed.querySelector('[data-instagram-feed-empty]');
  const errorState = feed.querySelector('[data-instagram-feed-error]');

  if (!track || !loadingState || !emptyState || !errorState) return;

  const showState = (state) => {
    loadingState.hidden = state !== 'loading';
    emptyState.hidden = state !== 'empty';
    errorState.hidden = state !== 'error';
  };

  showState('loading');

  if (!INSTAGRAM_FEED_ENDPOINT) {
    showState('error');
    return;
  }

  try {
    const response = await fetch(INSTAGRAM_FEED_ENDPOINT, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    });

    if (!response.ok) throw new Error(`Falha ao carregar o feed: ${response.status}`);

    const payload = await response.json();
    const receivedPosts = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload.posts) ? payload.posts : payload.data);
    const posts = Array.isArray(receivedPosts) ? receivedPosts.slice(0, 6) : [];

    if (posts.length === 0) {
      showState('empty');
      return;
    }

    const fragment = document.createDocumentFragment();

    posts.forEach((post) => {
      const permalink = post.permalink || post.url;
      const imageUrl = post.thumbnail_url || post.media_url || post.image_url;

      if (!permalink || !imageUrl) return;

      const link = document.createElement('a');
      link.className = 'instagram-feed-post';
      link.href = permalink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = post.caption ? post.caption.slice(0, 120) : 'Publicação do Instagram oficial de João Felipe';
      image.loading = 'lazy';
      image.decoding = 'async';

      const content = document.createElement('div');
      content.className = 'instagram-feed-post-content';

      const type = document.createElement('span');
      type.className = 'instagram-feed-post-type';
      const mediaType = String(post.media_product_type || post.media_type || '').toUpperCase();
      type.textContent = mediaType.includes('REEL')
        ? 'Reel'
        : (mediaType.includes('VIDEO') ? 'Vídeo' : (mediaType.includes('CAROUSEL') ? 'Carrossel' : 'Foto'));
      content.appendChild(type);

      if (post.caption) {
        const caption = document.createElement('p');
        caption.textContent = post.caption;
        content.appendChild(caption);
      }

      link.append(image, content);
      fragment.appendChild(link);
    });

    if (!fragment.childNodes.length) {
      showState('empty');
      return;
    }

    track.replaceChildren(fragment);
    showState('ready');
    initializeInstagramAutoplay();
  } catch (error) {
    console.warn('Feed do Instagram indisponível.', error);
    showState('error');
  }
};

initializeInstagramFeed();

/*
============================================================
JS_SELETORES_GERAIS
FINALIDADE: centralizar os elementos e a condição de mídia usados pelo menu.
SELETORES: [data-menu-toggle] é o botão; [data-menu] é a navegação; os links são
obtidos dentro do menu; matchMedia acompanha a entrada no layout de desktop.
COMO ALTERAR: mantenha os atributos do HTML sincronizados com estes seletores.
CUIDADOS: desktopBreakpoint usa 64rem, o mesmo valor de CSS_RESPONSIVIDADE_64REM.
DEPENDÊNCIAS: marcação do cabeçalho no index.html e media query do style.css.
============================================================
*/
const menuButton = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');
const menuLinks = menu ? menu.querySelectorAll('a') : [];
const desktopBreakpoint = window.matchMedia('(min-width: 64rem)');

/*
============================================================
JS_MENU_MOBILE
FINALIDADE: abrir e fechar a navegação em telas menores.
COMO FUNCIONA: closeMenu restaura aria-expanded="false", o rótulo de abertura e
remove is-open/menu-open; openMenu aplica os estados opostos.
COMO ALTERAR: preserve a correspondência entre classes JavaScript e CSS.
CUIDADOS: as verificações iniciais evitam erro caso botão ou menu não existam.
DEPENDÊNCIAS: JS_SELETORES_GERAIS, .is-open e body.menu-open no style.css.
============================================================
JS_ACESSIBILIDADE
FINALIDADE: comunicar corretamente o estado do menu e devolver o foco ao botão
quando o fechamento ocorre pela tecla Escape.
ATRIBUTOS: aria-expanded informa aberto/fechado e aria-label descreve a ação.
CUIDADOS: não remova a atualização dos atributos nem o retorno opcional de foco.
============================================================
*/
const closeMenu = ({ returnFocus = false } = {}) => {
  if (!menuButton || !menu) return;

  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  menu.classList.remove('is-open');
  document.body.classList.remove('menu-open');

  if (returnFocus) menuButton.focus();
};

const openMenu = () => {
  if (!menuButton || !menu) return;

  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Fechar menu');
  menu.classList.add('is-open');
  document.body.classList.add('menu-open');
};

/*
============================================================
JS_EVENTOS
FINALIDADE: conectar as interações do usuário às funções do menu móvel.
EVENTOS: click no botão alterna o estado; click em um link fecha o menu; keydown
com Escape fecha e devolve o foco; change do breakpoint fecha ao entrar no desktop.
COMO ALTERAR: registre novos eventos somente dentro da verificação de existência
dos elementos quando eles dependerem do menu.
CUIDADOS: preserve a navegação por teclado e evite listeners duplicados.
DEPENDÊNCIAS: JS_MENU_MOBILE, JS_ACESSIBILIDADE e desktopBreakpoint.
============================================================
*/
if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu({ returnFocus: true });
    }
  });

  desktopBreakpoint.addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });
}

/*
============================================================
JS_ANIMACOES_ENTRADA
FINALIDADE: revelar progressivamente elementos com a classe .reveal quando eles
entram na área visível da página.
COMO FUNCIONA: prefers-reduced-motion e a ausência de IntersectionObserver ativam
um fallback imediato. Nos demais casos, o observador adiciona .is-visible uma vez
e deixa de observar o elemento. threshold 0.12 exige 12% visível; rootMargin de
-5% na base posterga levemente o disparo.
COMO ALTERAR: ajuste threshold/rootMargin para mudar o momento da entrada.
CUIDADOS: mantenha o fallback para acessibilidade e navegadores sem suporte.
DEPENDÊNCIAS: CSS_ANIMACOES e CSS_RESPONSIVIDADE_REDUCAO_MOVIMENTO.
============================================================
*/
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealElements = document.querySelectorAll('.reveal');

if (reducedMotion.matches || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -5% 0px',
  });

  revealElements.forEach((element) => observer.observe(element));
}

/*
============================================================
JS_CABECALHO_SCROLL
STATUS: não implementado no código atual.
DOCUMENTAÇÃO: não existe detector de rolagem nem classe JavaScript específica
para alterar o cabeçalho durante o scroll. Uma implementação futura deverá
documentar o evento, a classe aplicada e o impacto visual correspondente no CSS.
============================================================
JS_HERO_SCROLL
STATUS: não implementado no código atual.
DOCUMENTAÇÃO: não há cálculo de progresso do hero, requestAnimationFrame ou
variável CSS atualizada pela rolagem. O efeito existente pertence ao CSS e ocorre
no carregamento, não por controle JavaScript de scroll.
============================================================
JS_FEED_INSTAGRAM
STATUS: estrutura e consumo do endpoint implementados.
DOCUMENTAÇÃO: INSTAGRAM_FEED_ENDPOINT deve receber o endereço de um servidor ou
serviço protegido que consulte a API oficial. Sem esse endereço, o fallback é
exibido e nenhuma publicação é inventada. Credenciais permanecem fora do frontend.
============================================================
*/
