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

// Onboarding wizard
(function () {
  const wizard = document.querySelector('.onboarding-wizard');
  if (!wizard) return;

  const steps = wizard.querySelectorAll('.onboarding-step');
  const result = wizard.querySelector('.onboarding-result');
  const resultContent = wizard.querySelector('.onboarding-result__content');
  const progressBar = wizard.querySelector('.onboarding-progress__bar');
  const btnNext = wizard.querySelector('.onboarding-btn--next');
  const btnBack = wizard.querySelector('.onboarding-btn--back');
  const stepLabel = wizard.querySelector('.onboarding-step-label');
  const totalSteps = steps.length;

  let currentStep = 0;
  const formData = {};

  function updateUI() {
    steps.forEach((s, i) => {
      s.hidden = i !== currentStep;
    });
    result.hidden = true;
    progressBar.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
    stepLabel.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
    btnBack.hidden = currentStep === 0;
    btnNext.textContent = currentStep === totalSteps - 1 ? 'Generate My Plan' : 'Continue';
  }

  // Option button clicks
  wizard.addEventListener('click', (e) => {
    const btn = e.target.closest('.onboarding-options button');
    if (!btn) return;

    const field = btn.dataset.field;
    const isMulti = btn.dataset.multi === 'true';
    const value = btn.textContent.trim();

    if (isMulti) {
      if (!formData[field]) formData[field] = [];
      const idx = formData[field].indexOf(value);
      if (idx > -1) formData[field].splice(idx, 1);
      else formData[field].push(value);
      btn.setAttribute('aria-pressed', idx === -1 ? 'true' : 'false');
    } else {
      // Deselect siblings
      btn.closest('.onboarding-options').querySelectorAll('button').forEach((b) => {
        b.setAttribute('aria-pressed', 'false');
      });
      btn.setAttribute('aria-pressed', 'true');
      formData[field] = value;
    }
  });

  // Text input
  const textInput = wizard.querySelector('.onboarding-input');
  if (textInput) {
    textInput.addEventListener('input', (e) => {
      formData[e.target.name] = e.target.value;
    });
  }

  btnNext.addEventListener('click', () => {
    if (currentStep < totalSteps - 1) {
      currentStep++;
      updateUI();
    } else {
      generatePlan();
    }
  });

  btnBack.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      updateUI();
    }
  });

  async function generatePlan() {
    steps.forEach((s) => (s.hidden = true));
    result.hidden = false;
    btnNext.hidden = true;
    btnBack.hidden = true;
    stepLabel.textContent = 'Generating...';
    progressBar.style.width = '100%';

    resultContent.innerHTML = `
      <div class="onboarding-loading">
        <div class="onboarding-skeleton" style="animation-delay:0ms"></div>
        <div class="onboarding-skeleton" style="animation-delay:150ms"></div>
        <div class="onboarding-skeleton" style="animation-delay:300ms"></div>
        <div class="onboarding-skeleton" style="animation-delay:450ms"></div>
      </div>
    `;

    try {
      const res = await fetch('https://ai-onboarding-demo.vercel.app/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      resultContent.innerHTML = formatPlan(data.plan);
      stepLabel.textContent = 'Your AI Plan';

      // Add restart button
      const restartBtn = document.createElement('button');
      restartBtn.className = 'onboarding-btn--back';
      restartBtn.textContent = 'Start Over';
      restartBtn.style.marginTop = '1.5rem';
      restartBtn.addEventListener('click', () => {
        currentStep = 0;
        Object.keys(formData).forEach((k) => delete formData[k]);
        wizard.querySelectorAll('button[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        if (textInput) textInput.value = '';
        result.hidden = true;
        btnNext.hidden = false;
        restartBtn.remove();
        updateUI();
      });
      resultContent.appendChild(restartBtn);
    } catch {
      resultContent.innerHTML = '<p>Something went wrong. Please try again.</p>';
      stepLabel.textContent = 'Error';
    }
  }

  function formatPlan(text) {
    return text
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n- (.*)/g, '\n<li>$1</li>')
      .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<)/, '<p>')
      .replace(/(?!>)$/, '</p>');
  }

  updateUI();
})();

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
