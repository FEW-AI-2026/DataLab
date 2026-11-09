/**
 * DataLab Cinvestav · Motor Interactivo Ultrarrápido
 * Gestiona filtrado instantáneo de Datasets, Publicaciones, Tesis,
 * Cursos, Generador BibTeX y Tema Claro/Oscuro.
 */

(function () {
  'use strict';

  // Estado global de la aplicación
  const state = {
    datasets: [],
    publications: [],
    theses: [],
    courses: [],
    labInfo: null,
    currentTheme: localStorage.getItem('datalab-theme') || 'light',
    activeDatasetFilter: 'all',
    activeThesisDegree: 'all',
    datasetSearchQuery: '',
    pubSearchQuery: '',
    pubYearFilter: 'all',
    thesisSearchQuery: ''
  };

  // Inicialización del DOM
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
    loadAllData();
    initModalEvents();
  });

  /* ==========================================================================
     1. Gestión del Tema (Dark / Light Mode)
     ========================================================================== */
  function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    applyTheme(state.currentTheme);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('datalab-theme', state.currentTheme);
        applyTheme(state.currentTheme);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      toggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
  }

  /* ==========================================================================
     2. Menú Móvil (Apertura, Cierre al Enlace y Cierre al Clic Externo)
     ========================================================================== */
  function initMobileNav() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');

    if (mobileBtn && navMenu) {
      // Toggle al hacer clic en el botón hamburguesa
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navMenu.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Cerrar menú al hacer clic en cualquiera de los enlaces internos
      navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navMenu.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        });
      });

      // Cerrar menú al hacer clic en cualquier parte fuera del menú desplegable
      document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('open')) {
          const isClickInsideMenu = navMenu.contains(e.target);
          const isClickOnToggle = mobileBtn.contains(e.target);
          if (!isClickInsideMenu && !isClickOnToggle) {
            navMenu.classList.remove('open');
            mobileBtn.setAttribute('aria-expanded', 'false');
          }
        }
      });

      // Cerrar menú al presionar la tecla Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('open')) {
          navMenu.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ==========================================================================
     3. Carga Asíncrona de Datos
     ========================================================================== */
  async function loadAllData() {
    try {
      const [resDatasets, resPubs, resTheses, resCourses, resLab] = await Promise.all([
        fetch('./data/datasets.json').then(r => r.json()),
        fetch('./data/publications.json').then(r => r.json()),
        fetch('./data/theses.json').then(r => r.json()),
        fetch('./data/courses.json').then(r => r.json()),
        fetch('./data/lab_info.json').then(r => r.json())
      ]);

      state.datasets = resDatasets;
      state.publications = resPubs;
      state.theses = resTheses;
      state.courses = resCourses;
      state.labInfo = resLab;

      renderDatasets();
      initDatasetControls();

      renderPublications();
      initPublicationControls();

      renderTheses();
      initThesesControls();

      renderCourses();
    } catch (err) {
      console.error('Error cargando los recursos de DataLab:', err);
    }
  }

  /* ==========================================================================
     4. Datasets & Benchmarks (Render y Filtros)
     ========================================================================== */
  function initDatasetControls() {
    const searchInput = document.getElementById('dataset-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.datasetSearchQuery = e.target.value.toLowerCase().trim();
        renderDatasets();
      });
    }

    const pills = document.querySelectorAll('.topic-pill[data-dataset-cat]');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.activeDatasetFilter = pill.getAttribute('data-dataset-cat');
        renderDatasets();
      });
    });
  }

  function renderDatasets() {
    const container = document.getElementById('datasets-grid-container');
    const countEl = document.getElementById('datasets-counter');
    if (!container) return;

    const filtered = state.datasets.filter(ds => {
      const matchesCat = state.activeDatasetFilter === 'all' || 
                         (state.activeDatasetFilter === 'mexico' && ds.is_mexico) ||
                         ds.category === state.activeDatasetFilter;
      
      const q = state.datasetSearchQuery;
      const matchesSearch = !q || 
                            ds.title.toLowerCase().includes(q) || 
                            ds.description.toLowerCase().includes(q) || 
                            ds.keywords.toLowerCase().includes(q) ||
                            ds.format.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });

    if (countEl) {
      countEl.textContent = `Mostrando ${filtered.length} de ${state.datasets.length} recursos abiertos`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <p style="font-size: 1.1rem; font-weight: 600;">No se encontraron datasets para el criterio seleccionado.</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">Prueba con otra palabra clave o restablece los filtros temáticos.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(ds => {
      const categoryNames = {
        agri: 'Agricultura & Clima',
        water: 'Recursos Hídricos',
        energy: 'Red Eléctrica & Energía',
        climate: 'Medio Ambiente',
        comp: 'Computación & HPC',
        health: 'Salud & Biocomputación',
        bci: 'BCI & Señales'
      };
      const catLabel = categoryNames[ds.category] || ds.category.toUpperCase();
      const mexicoBadge = ds.is_mexico ? '<span style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.7rem; font-weight:700; color:var(--color-gold); background:rgba(198,138,39,0.12); padding:0.15rem 0.55rem; border-radius:var(--radius-pill); margin-left:0.4rem;"><span class="shape shape-diamond" style="background-color:var(--color-gold);"></span> México</span>' : '';

      return `
        <article class="dataset-card-modern">
          <div class="dataset-top-meta">
            <div>
              <span class="dataset-category-pill">${catLabel}</span>
              ${mexicoBadge}
            </div>
            <span class="dataset-year">${ds.year}</span>
          </div>
          <h3 class="dataset-name">${escapeHtml(ds.title)}</h3>
          <p class="dataset-summary">${escapeHtml(ds.description)}</p>
          <div class="dataset-bottom-info">
            <span class="dataset-format-tag">${escapeHtml(ds.format || 'CSV / API')}</span>
            <button type="button" class="btn-open-dataset" data-dataset-info="${escapeHtml(JSON.stringify(ds))}">
              Explorar datos
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Eventos para abrir modal de dataset
    container.querySelectorAll('.btn-open-dataset').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = JSON.parse(btn.getAttribute('data-dataset-info'));
        openDatasetModal(data);
      });
    });
  }

  /* ==========================================================================
     5. Publicaciones Científicas (Render, Búsqueda y BibTeX)
     ========================================================================== */
  function initPublicationControls() {
    const searchInput = document.getElementById('pub-search-input');
    const yearSelect = document.getElementById('pub-year-select');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.pubSearchQuery = e.target.value.toLowerCase().trim();
        renderPublications();
      });
    }

    if (yearSelect) {
      // Llenar selector de años
      const years = Array.from(new Set(state.publications.map(p => p.year))).sort((a, b) => b - a);
      yearSelect.innerHTML = '<option value="all">Todos los años (' + state.publications.length + ')</option>' +
        years.map(y => `<option value="${y}">${y}</option>`).join('');

      yearSelect.addEventListener('change', (e) => {
        state.pubYearFilter = e.target.value;
        renderPublications();
      });
    }
  }

  function renderPublications() {
    const container = document.getElementById('publications-list-container');
    const countEl = document.getElementById('pubs-counter');
    if (!container) return;

    const filtered = state.publications.filter(p => {
      const matchesYear = state.pubYearFilter === 'all' || p.year.toString() === state.pubYearFilter;
      const q = state.pubSearchQuery;
      const matchesSearch = !q || 
                            p.title.toLowerCase().includes(q) || 
                            p.citation.toLowerCase().includes(q) ||
                            (p.venue && p.venue.toLowerCase().includes(q));

      return matchesYear && matchesSearch;
    });

    if (countEl) {
      countEl.textContent = `${filtered.length} artículos encontrados`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <p>No se encontraron publicaciones con esos términos de búsqueda.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((p, idx) => {
      const doiLink = p.doi ? `
        <a href="${p.doi}" target="_blank" rel="noopener noreferrer" class="btn-doi-link">
          DOI <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M7 7h10v10"/></svg>
        </a>
      ` : '';

      return `
        <article class="publication-item">
          <div class="pub-year-badge">${p.year}</div>
          <div class="pub-content">
            <h4>${escapeHtml(p.title)}</h4>
            ${p.venue ? `<p class="pub-venue">${escapeHtml(p.venue)}</p>` : ''}
            <p class="pub-citation">${escapeHtml(p.citation)}</p>
          </div>
          <div class="pub-actions">
            <button type="button" class="btn-bibtex" data-pub-index="${idx}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              BibTeX
            </button>
            ${doiLink}
          </div>
        </article>
      `;
    }).join('');

    // Eventos para abrir modal BibTeX
    container.querySelectorAll('.btn-bibtex').forEach(btn => {
      btn.addEventListener('click', () => {
        const pubIndex = parseInt(btn.getAttribute('data-pub-index'), 10);
        openBibtexModal(filtered[pubIndex]);
      });
    });
  }

  /* ==========================================================================
     6. Tesis & Egresados (Render y Filtro de Grado)
     ========================================================================== */
  function initThesesControls() {
    const buttons = document.querySelectorAll('.btn-degree-toggle');
    const searchInput = document.getElementById('thesis-search-input');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeThesisDegree = btn.getAttribute('data-degree');
        renderTheses();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.thesisSearchQuery = e.target.value.toLowerCase().trim();
        renderTheses();
      });
    }
  }

  function renderTheses() {
    const container = document.getElementById('theses-grid-container');
    const countEl = document.getElementById('theses-counter');
    if (!container) return;

    const filtered = state.theses.filter(t => {
      const matchesDegree = state.activeThesisDegree === 'all' || t.degree === state.activeThesisDegree;
      const q = state.thesisSearchQuery;
      const matchesSearch = !q ||
                            t.student.toLowerCase().includes(q) ||
                            t.topic.toLowerCase().includes(q) ||
                            t.year.toString().includes(q);

      return matchesDegree && matchesSearch;
    });

    if (countEl) {
      countEl.textContent = `Listando ${filtered.length} de ${state.theses.length} tesis de grado (2002–2025)`;
    }

    container.innerHTML = filtered.map(t => {
      const isPhd = t.degree === 'phd';
      return `
        <article class="thesis-card-item">
          <div class="thesis-meta-row">
            <span class="thesis-degree-pill ${isPhd ? 'phd' : ''}">${isPhd ? 'Doctorado' : 'Maestría'}</span>
            <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; color: var(--text-faint);">${t.year}</span>
          </div>
          <h4 class="thesis-student">${escapeHtml(t.student)}</h4>
          <p class="thesis-topic">${escapeHtml(t.topic || 'Investigación computacional en sistemas inteligentes y minería de datos.')}</p>
        </article>
      `;
    }).join('');
  }

  /* ==========================================================================
     7. Cursos de Posgrado
     ========================================================================== */
  function renderCourses() {
    const container = document.getElementById('courses-grid-container');
    if (!container) return;

    container.innerHTML = state.courses.map(c => `
      <article class="course-card-modern">
        <img class="course-cover-img" src="${c.image}" alt="${escapeHtml(c.image_alt || c.title)}" loading="lazy" width="600" height="338">
        <div class="course-body">
          <span class="course-cat">${escapeHtml(c.category)}</span>
          <h4 class="course-title">${escapeHtml(c.title)}</h4>
        </div>
      </article>
    `).join('');
  }

  /* ==========================================================================
     8. Modal BibTeX & Detalle de Dataset
     ========================================================================== */
  function initModalEvents() {
    const modal = document.getElementById('app-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const copyBtn = document.getElementById('modal-copy-btn');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
          modal.classList.remove('open');
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const text = document.getElementById('modal-code-content').textContent;
        try {
          await navigator.clipboard.writeText(text);
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ¡Copiado con éxito!
          `;
          setTimeout(() => {
            copyBtn.innerHTML = orig;
          }, 2000);
        } catch (err) {
          console.error('Error al copiar:', err);
        }
      });
    }
  }

  function openBibtexModal(pub) {
    const modal = document.getElementById('app-modal');
    const titleEl = document.getElementById('modal-title');
    const contentEl = document.getElementById('modal-code-content');
    const copyBtn = document.getElementById('modal-copy-btn');

    const citeKey = generateCiteKey(pub);
    const bibtex = `@article{${citeKey},
  title = {${pub.title}},
  author = {Li, Xiaoou and Colaboradores DataLab},
  journal = {${pub.venue || 'Cinvestav Computación'}},
  year = {${pub.year}},
  note = {${pub.citation.replace(/[\\{}]/g, '')}},
  ${pub.doi ? `doi = {${pub.doi}},` : ''}
  publisher = {Departamento de Computación, Cinvestav}
}`;

    titleEl.textContent = 'Referencia BibTeX';
    contentEl.textContent = bibtex;
    copyBtn.style.display = 'inline-flex';
    modal.classList.add('open');
  }

  function openDatasetModal(ds) {
    const modal = document.getElementById('app-modal');
    const titleEl = document.getElementById('modal-title');
    const contentEl = document.getElementById('modal-code-content');
    const copyBtn = document.getElementById('modal-copy-btn');

    const metaInfo = `# Dataset: ${ds.title} (${ds.year})
Identificador: ${ds.id}
Categoría: ${ds.category.toUpperCase()}
Ámbito geográfico: ${ds.is_mexico ? 'México / Regional' : 'Global / Benchmark'}
Formato disponible: ${ds.format}

DESCRIPCIÓN TÉCNICA:
${ds.description}

PALABRAS CLAVE:
${ds.keywords}

ACCESO Y REPOSITORIO:
Los datos y scripts de preprocesamiento se encuentran indexados para uso académico y de investigación en DataLab Cinvestav.
Contacto para descarga directa de series temporales completas: lixo@cs.cinvestav.mx`;

    titleEl.textContent = ds.title;
    contentEl.textContent = metaInfo;
    copyBtn.style.display = 'inline-flex';
    modal.classList.add('open');
  }

  function generateCiteKey(pub) {
    const firstWord = (pub.title.split(' ')[0] || 'paper').replace(/[^a-zA-Z]/g, '').toLowerCase();
    return `datalab_${pub.year}_${firstWord}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
