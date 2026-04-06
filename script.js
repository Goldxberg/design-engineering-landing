// Theme toggle
const toggle = document.getElementById('theme-toggle');
const root = document.documentElement;

// Check for saved preference or default to system
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  root.dataset.theme = savedTheme;
}

toggle.addEventListener('click', () => {
  const current = root.dataset.theme;
  let next;

  if (!current || current === 'system') {
    // Detect current system preference and go opposite
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    next = prefersDark ? 'light' : 'dark';
  } else if (current === 'dark') {
    next = 'light';
  } else {
    next = 'dark';
  }

  // Use view transitions if available
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      root.dataset.theme = next;
    });
  } else {
    root.dataset.theme = next;
  }

  localStorage.setItem('theme', next);
});

// Morphing disclosure: measure content heights for animation
function measureContentHeights() {
  document.querySelectorAll('.morphing-disclosure').forEach((container) => {
    const details = container.querySelectorAll('details');
    if (details.length === 0) return;

    const originalVisibility = container.style.visibility;
    container.style.visibility = 'hidden';

    details.forEach((detail) => {
      const wasOpen = detail.hasAttribute('open');
      if (!wasOpen) detail.setAttribute('open', '');
      detail.offsetHeight;

      const content = detail.querySelector('.content');
      if (content) {
        const height = Math.ceil(content.getBoundingClientRect().height);
        detail.style.setProperty('--content-height', `${height}px`);
      }

      if (!wasOpen) detail.removeAttribute('open');
    });

    container.style.visibility = originalVisibility;
  });
}
measureContentHeights();

// Generate table of contents
function generateTableOfContents() {
  const tocElement = document.querySelector('table-of-contents');
  if (!tocElement) return;

  const article = document.querySelector('article');
  if (!article) return;

  const pipDemo = document.getElementById('pip-demo');
  const pipHeadings = pipDemo ? Array.from(pipDemo.querySelectorAll('h2, h3, h4, h5, h6')) : [];
  const articleHeadings = Array.from(article.querySelectorAll('h2, h3, h4, h5, h6'));

  // Merge in document order
  const headings = [...pipHeadings, ...articleHeadings].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  if (headings.length === 0) return;

  const buildTOC = (items, startIndex = 0, currentLevel = 1) => {
    const list = document.createElement('ol');
    let index = startIndex;

    while (index < items.length) {
      const item = items[index];
      const level = parseInt(item.tagName.charAt(1));

      if (level < currentLevel) {
        break;
      }

      if (level === currentLevel) {
        const listItem = document.createElement('li');
        const link = document.createElement('a');

        const id = item.id || item.textContent.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        if (!item.id) {
          item.id = id;
        }

        link.href = `#${id}`;
        link.textContent = item.textContent.trim();

        listItem.appendChild(link);
        index++;

        // Check if there are nested items
        if (index < items.length) {
          const nextLevel = parseInt(items[index].tagName.charAt(1));
          if (nextLevel > currentLevel) {
            const result = buildTOC(items, index, currentLevel + 1);
            listItem.appendChild(result.list);
            index = result.nextIndex;
          }
        }

        list.appendChild(listItem);
      } else {
        break;
      }
    }

    return { list, nextIndex: index };
  };

  // Create nav element with proper accessibility
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Table of Contents');

  const heading = document.createElement('h2');
  heading.textContent = 'Contents';
  nav.appendChild(heading);

  const result = buildTOC(headings, 0, 2);
  nav.appendChild(result.list);
  const split = document.createElement('hr');
  split.classList.add('split');
  nav.appendChild(split);
  const backToTop = document.createElement('div');
  backToTop.classList.add('back-to-top');
  backToTop.innerHTML = `
  <a aria-label="Back to Top" href="#pre">
  top <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
    <path stroke-linecap="round" stroke-linejoin="round" d="m11.99 7.5 3.75-3.75m0 0 3.75 3.75m-3.75-3.75v16.499H4.49" />
  </svg>
  </a>
  `;

  nav.appendChild(backToTop);
  tocElement.appendChild(nav);
}

generateTableOfContents();

// Skill panel toggle
const panelMap = { free: 'precision', solo: 'adaptability', team: 'execution' };
const radios = document.querySelectorAll('input[name="tier"]');
const panels = document.querySelectorAll('.skill-panel');

function activatePanel() {
  const checked = document.querySelector('input[name="tier"]:checked');
  if (!checked) return;
  const target = panelMap[checked.id];
  panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === target));
}

radios.forEach((r) => r.addEventListener('change', activatePanel));
activatePanel();

// PiP scroll-state fallback via IntersectionObserver
if (!CSS.supports('container-type: scroll-state')) {
  const sentinel = document.getElementById('pip-sentinel');
  const demo = document.getElementById('pip-demo');
  if (sentinel && demo) {
    const observer = new IntersectionObserver((entries) => {
      demo.dataset.stuck = !entries[0].isIntersecting;
    });
    observer.observe(sentinel);
  }
}

// Course cards interaction (from CodePen XJWNMOO)
const list = document.querySelector('.course-list');
if (list) {
  const items = list.querySelectorAll('li');
  const setIndex = (event) => {
    const closest = event.target.closest('li');
    if (closest) {
      const index = [...items].indexOf(closest);
      const cols = new Array(list.children.length)
        .fill()
        .map((_, i) => {
          items[i].dataset.active = (index === i).toString();
          return index === i ? '10fr' : '1fr';
        })
        .join(' ');
      list.style.setProperty('grid-template-columns', cols);
    }
  };
  list.addEventListener('focus', setIndex, true);
  list.addEventListener('click', setIndex);
  list.addEventListener('pointermove', setIndex);

  const resync = () => {
    const w = Math.max(...[...items].map((i) => i.offsetWidth));
    list.style.setProperty('--article-width', w);
  };
  window.addEventListener('resize', resync);
  resync();
}
