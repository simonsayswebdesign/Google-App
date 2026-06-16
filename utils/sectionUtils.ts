

/**
 * Parses an HTML string and removes background colors, gradients, and decorative blobs
 * to make the section transparent for Chai Builder import.
 */
export const stripBackgrounds = (html: string): string => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const section = doc.body.firstElementChild as HTMLElement;
        
        if (!section) return html;

        // 1. Clean Root Classes
        const classesToRemoveRegex = /^(bg-(?!clip-text)|from-|to-|via-|gradient-)/;
        const currentClasses = section.className.split(/\s+/);
        const newClasses = currentClasses.filter(cls => !classesToRemoveRegex.test(cls));
        section.className = newClasses.join(' ') + ' bg-transparent';
        
        // 2. Remove Decorative Elements (Blobs, Overlays)
        const allElements = section.getElementsByTagName('*');
        const elementsToCheck = Array.from(allElements);

        elementsToCheck.forEach(el => {
            if (!(el instanceof HTMLElement)) return;
            const cls = el.className;
            if (!cls || typeof cls !== 'string') return;

            // Remove z-index blobs or background blur effects that aren't content
            if (cls.includes('-z-') || (cls.includes('absolute') && cls.includes('blur-') && !el.textContent?.trim())) {
                el.remove();
            }
        });

        section.style.removeProperty('background');
        section.style.removeProperty('background-color');
        section.style.removeProperty('background-image');

        return section.outerHTML;
    } catch (e) {
        console.error("Failed to strip background", e);
        return html;
    }
};

/**
 * Injects metadata (name, description, style, isTransparent) into the root node of the HTML section.
 * This is used for robust session restoration and preserving design styles/names on import.
 */
export const injectMetadataToHtml = (html: string, section: { name: string; description: string; style?: string; isTransparent?: boolean }): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement;
    if (root) {
      root.setAttribute('data-chaigen-name', section.name);
      root.setAttribute('data-chaigen-description', section.description);
      if (section.style) {
        root.setAttribute('data-chaigen-style', section.style);
      }
      if (section.isTransparent !== undefined) {
        root.setAttribute('data-chaigen-is-transparent', section.isTransparent ? 'true' : 'false');
      }
      return root.outerHTML;
    }
    return html;
  } catch (e) {
    console.error("Failed to inject metadata to HTML", e);
    return html;
  }
};

/**
 * Wraps section HTML in a raw snippet optimized for Chai Builder, Oxygen & Windpress.
 * Includes necessary font imports and minimal CSS fixes for Tailwind environments.
 */
export const constructFullPageHtml = (input: string | any[]): string => {
  let bodyContent = '';
  if (typeof input === 'string') {
    bodyContent = input;
  } else if (Array.isArray(input)) {
    bodyContent = input.map(s => injectMetadataToHtml(s.html, s)).join('\n\n');
  }

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return `<!-- 
  Designed by Simon Says Web Design © ${date} All Rights Reserved
  Optimized for: Oxygen Builder (Standalone / No Plugin)
  Includes: Tailwind CSS CDN + Custom Config
-->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    important: true,
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: { 
            sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
            serif: ['"Instrument Serif"', '"Cormorant Garamond"', '"Playfair Display"', 'serif'],
            mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'float': 'float 3s ease-in-out infinite',
          'fade-in': 'fadeIn 0.6s ease-out both',
          'fade-in-up': 'fadeInUp 0.8s ease-out both',
          'fade-in-down': 'fadeInDown 0.8s ease-out both',
          'zoom-in': 'zoomIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          'reveal': 'reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' },
          },
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' }
          },
          fadeInUp: {
            '0%': { opacity: '0', transform: 'translateY(20px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' }
          },
          fadeInDown: {
            '0%': { opacity: '0', transform: 'translateY(-20px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' }
          },
          zoomIn: {
            '0%': { opacity: '0', transform: 'scale(0.95)' },
            '100%': { opacity: '1', transform: 'scale(1)' }
          },
          reveal: {
            '0%': { 'clip-path': 'inset(0 100% 0 0)', '-webkit-clip-path': 'inset(0 100% 0 0)' },
            '100%': { 'clip-path': 'inset(0 0 0 0)', '-webkit-clip-path': 'inset(0 0 0 0)' }
          }
        }
      }
    }
  }
</script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Instrument+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital,wght@0,400;1,400&family=Italiana&family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Share+Tech+Mono&family=Syne:wght@400;500;600;700;800&family=Unbounded:wght@300;400;500;600;700;800;900&family=Urbanist:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

<style>
  /* Stagger delays for premium sequential loading */
  .delay-100 { animation-delay: 100ms !important; }
  .delay-200 { animation-delay: 200ms !important; }
  .delay-300 { animation-delay: 300ms !important; }
  .delay-400 { animation-delay: 400ms !important; }
  .delay-500 { animation-delay: 500ms !important; }
  .delay-700 { animation-delay: 700ms !important; }
  .delay-1000 { animation-delay: 1000ms !important; }

  /* 
   * OXYGEN / BUILDER RESET
   * These styles ensure the pasted code renders correctly inside Oxygen's structure.
   */
  
  /* Font Families - Fallback if Tailwind config fails */
  .font-sans { font-family: 'Inter', 'Plus Jakarta Sans', sans-serif; }
  .font-serif { font-family: 'Instrument Serif', 'Cormorant Garamond', serif; }
  .font-mono { font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace; }

  /* 
   * RESPONSIVE IMAGE SAFETY 
   * Global override to prevent image blowouts on small screens
   */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* 
   * TEXT CLIPPING PROTECTION
   * Adds microscopic padding to prevent italic fonts from being cut off.
   */
  h1, h2, h3, h4, h5, h6, .italic, .font-serif, .bg-clip-text {
    padding-right: 0.15em;
    margin-right: -0.15em;
    overflow: visible;
  }
  
  /* Gradient Text Helper */
  .bg-clip-text {
    -webkit-background-clip: text !important;
    background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    color: transparent !important;
    display: inline-block !important;
  }
  
  .text-transparent {
    -webkit-text-fill-color: transparent !important;
    color: transparent !important;
  }

  /* UNIVERSAL GRADIENT BORDERS (OXYGEN/PINEGROW COMPATIBLE) */
  html body [class*="border-gradient-"],
  html body button[class*="border-gradient-"],
  html body a[class*="border-gradient-"],
  [class*="border-gradient-"] {
    border-width: 2px !important;
    border-style: solid !important;
    border-color: transparent !important;
    background-origin: border-box !important;
    -webkit-background-clip: padding-box, border-box !important;
    background-clip: padding-box, border-box !important;
    /* Tailwind v3 JIT compatibility fallbacks for position stops */
    --tw-gradient-from-position:  ;
    --tw-gradient-to-position:  ;
    --tw-gradient-via-position:  ;
  }
  .border-gradient-to-r {
    background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                      linear-gradient(to right, var(--tw-gradient-from, var(--gradient-from, #a855f7)), var(--tw-gradient-to, var(--gradient-to, #06b6d4))) !important;
  }
  .border-gradient-to-l {
    background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                      linear-gradient(to left, var(--tw-gradient-from, var(--gradient-from, #a855f7)), var(--tw-gradient-to, var(--gradient-to, #06b6d4))) !important;
  }
  .border-gradient-to-t {
    background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                      linear-gradient(to top, var(--tw-gradient-from, var(--gradient-from, #a855f7)), var(--tw-gradient-to, var(--gradient-to, #06b6d4))) !important;
  }
  .border-gradient-to-b {
    background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                      linear-gradient(to bottom, var(--tw-gradient-from, var(--gradient-from, #a855f7)), var(--tw-gradient-to, var(--gradient-to, #06b6d4))) !important;
  }

  /* Layout Stability for Oxygen Code Block */
  section {
    position: relative;
    width: 100%;
    overflow: hidden; 
  }

  /* 
   * CONTAINER CONSISTENCY
   * Forces all containers to have the exact same max-width and padding
   * to ensure pixel-perfect alignment across different sections.
   */
  .container, 
  section > div[class*="max-w-"],
  section > div[class*="max-w-screen-"] {
    width: 100% !important;
    max-width: 1280px !important; /* Equivalent to max-w-7xl */
    margin-left: auto !important;
    margin-right: auto !important;
  }
  
  /* Standardized Padding */
  .container,
  section > div {
    padding-left: 1.5rem !important; /* px-6 */
    padding-right: 1.5rem !important;
  }
  
  @media (min-width: 768px) {
    .container,
    section > div {
      padding-left: 3rem !important; /* md:px-12 */
      padding-right: 3rem !important;
    }
  }

  /* 
   * LINK AND BUTTON RESET
   * Forces links and buttons to inherit color/decoration so Tailwind classes take precedence.
   * This prevents default blue links or active/hover colors from Oxygen/WordPress overriding the design.
   */
  a, button {
    color: inherit;
    text-decoration: none !important;
  }
  a:hover, button:hover, a:focus, button:focus, a:active, button:active, a:visited {
    color: inherit;
    text-decoration: none !important;
  }

  /* Scroll-triggered Entrance Animations */
  .animate-paused {
    animation-play-state: paused !important;
  }
  .animate-started {
    animation-play-state: running !important;
  }
</style>

<!-- SECTIONS START -->
${bodyContent
    // BUILDER VIEWPORT FIX: Downgrade desktop layout breakpoints from lg: (1024px) to md: (768px)
    // This ensures columns appear side-by-side in the smaller Builder iframe/canvas.
    .replace(/lg:(flex|grid|block|hidden|inline|static|relative|absolute|fixed|sticky)/g, 'md:$1')
    .replace(/lg:flex-row/g, 'md:flex-row')
    .replace(/lg:grid-cols-/g, 'md:grid-cols-')
    .replace(/lg:col-span-/g, 'md:col-span-')
    .replace(/lg:gap-/g, 'md:gap-')
    .replace(/lg:items-/g, 'md:items-')
    .replace(/lg:justify-/g, 'md:justify-')
    .replace(/lg:text-/g, 'md:text-')
    .replace(/lg:p-/g, 'md:p-')
    .replace(/lg:px-/g, 'md:px-')
    .replace(/lg:py-/g, 'md:py-')
    .replace(/lg:m-/g, 'md:m-')
    .replace(/lg:mx-/g, 'md:mx-')
    .replace(/lg:my-/g, 'md:my-')
    .replace(/lg:w-\[/g, 'md:w-[') // Arbitrary widths
    .replace(/lg:w-1\//g, 'md:w-1/') // Fractions
    .replace(/lg:w-2\//g, 'md:w-2/')
    .replace(/lg:w-3\//g, 'md:w-3/')
    .replace(/lg:w-4\//g, 'md:w-4/')
    .replace(/lg:w-5\//g, 'md:w-5/')
    .replace(/lg:w-full/g, 'md:w-full')
    .replace(/lg:w-auto/g, 'md:w-auto')
    .replace(/lg:max-w-/g, 'md:max-w-')
    .replace(/lg:min-h-/g, 'md:min-h-')
    .replace(/lg:h-/g, 'md:h-')
    .replace(/lg:top-/g, 'md:top-')
    .replace(/lg:left-/g, 'md:left-')
    .replace(/lg:right-/g, 'md:right-')
    .replace(/lg:bottom-/g, 'md:bottom-')
}
<!-- SECTIONS END -->

<script>
  (function() {
    if (window.__chaigen_observer_init) return;
    window.__chaigen_observer_init = true;

    function initAnimations() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-started');
            entry.target.classList.remove('animate-paused');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
      });

      const animElements = document.querySelectorAll('[class*="animate-"]');
      animElements.forEach(el => {
        const classes = el.className || '';
        if (
          classes.includes('animate-spin') || 
          classes.includes('animate-bounce') || 
          classes.includes('animate-pulse') || 
          classes.includes('animate-slow') || 
          classes.includes('animate-infinite')
        ) {
          return;
        }

        el.classList.add('animate-paused');
        el.classList.remove('animate-started');
        observer.observe(el);
      });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(initAnimations, 50);
    } else {
      document.addEventListener('DOMContentLoaded', () => setTimeout(initAnimations, 50));
    }
  })();
</script>`;
};

/**
 * Walks through an element's query structures to find the first high-value text content,
 * prioritizing headings (h1-h6) and paragraph texts (p), and falling back to leaf elements.
 */
export const findFirstTextLine = (element: Element): string | null => {
    try {
        // 1. Try headings and paragraphs first
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        for (const h of Array.from(headings)) {
            const txt = h.textContent?.replace(/\s+/g, ' ').trim();
            // Skip placeholders like CHAIGEN_TEXT_ or templates
            if (txt && txt.length > 2 && !txt.startsWith('CHAIGEN_') && !txt.startsWith('<!--')) {
                return txt;
            }
        }

        // 2. Fallback to any leaf element under the tree (span, a, button, etc.)
        const allEls = element.querySelectorAll('*');
        for (const item of Array.from(allEls)) {
            if (item.children.length === 0) {
                const txt = item.textContent?.replace(/\s+/g, ' ').trim();
                if (txt && txt.length > 2 && !txt.startsWith('CHAIGEN_')) {
                    return txt;
                }
            }
        }
    } catch (e) {
        console.error("Error finding first text line", e);
    }
    return null;
};

/**
 * Intelligent Deconstruction:
 * Parses any previously exported snippet, HTML document, or custom section block list.
 * Extracts individual section components and pulls out embedded metadata (name, description, etc.).
 */
export const deconstructSnippet = (html: string) => {
    try {
        let processedHtml = html;

        // 1. Parse and extract ACF field values from PHP schema definitions if present (e.g., 'field_id' => 'value')
        // Using an escape-aware regex to handle custom escaped quotes inside the PHP literal arrays:
        const schemaMap = new Map<string, string>();
        const schemaRegex = /'((?:[^'\\]|\\.)*)'\s*=>\s*'((?:[^'\\]|\\.)*)'/g;
        let schemaMatch;
        while ((schemaMatch = schemaRegex.exec(html)) !== null) {
            const key = schemaMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
            const val = schemaMatch[2].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
            schemaMap.set(key, val);
        }

        // 2. Replace the typical PHP echo statements in layout (e.g. <?php echo esc_html($fields['...']); ?>)
        // with their original default values from the schema map so DOMParser sees/restores authentic design texts:
        processedHtml = processedHtml.replace(/<\?php\s+echo\s+(?:esc_html|esc_url|do_shortcode)\(\$fields\['([^']+)'\]\);\s*\?>/gi, (match, fieldId) => {
            return schemaMap.has(fieldId) ? schemaMap.get(fieldId)! : '';
        });

        // 3. Strip all remaining / headers PHP blocks completely. This prevents browsers from misinterpreting
        // raw PHP open tags as unclosed tags and erroneously nesting the whole layout inside elements.
        processedHtml = processedHtml
            .replace(/<\?php[\s\S]*?\?>/gi, '')
            .replace(/<\?=[\s\S]*?\?>/gi, '')
            .replace(/<\?[\s\S]*?\?>/gi, '')
            .replace(/<\?php[\s\S]*$/gi, '')
            .replace(/<\?[\s\S]*$/gi, '');

        const parser = new DOMParser();
        const doc = parser.parseFromString(processedHtml, 'text/html');

        // Extract extra utility layers from head or layout wrapper (styles, script, links for fonts)
        const extraHeadTags: string[] = [];
        
        doc.querySelectorAll('style').forEach(el => {
            extraHeadTags.push(el.outerHTML);
        });

        doc.querySelectorAll('script').forEach(el => {
            const src = el.getAttribute('src');
            // Skip the tailwind cdn since it is already integrated
            if (src && src.includes('tailwindcss.com')) return;
            extraHeadTags.push(el.outerHTML);
        });

        doc.querySelectorAll('link').forEach(el => {
            extraHeadTags.push(el.outerHTML);
        });

        const extraTagsHtml = extraHeadTags.join('\n');

        // Extract body class & style
        const bodyClass = doc.body?.className || '';
        const bodyStyle = doc.body?.getAttribute('style') || '';
        
        let sectionElements: Element[] = [];

        // 4. Try parsing within standard SECTIONS comment boundary tags first
        const sectionsStartIdx = processedHtml.indexOf('<!-- SECTIONS START -->');
        const sectionsEndIdx = processedHtml.indexOf('<!-- SECTIONS END -->');
        if (sectionsStartIdx !== -1 && sectionsEndIdx !== -1) {
            const sectionsHtml = processedHtml.substring(sectionsStartIdx + '<!-- SECTIONS START -->'.length, sectionsEndIdx);
            const innerDoc = parser.parseFromString(sectionsHtml, 'text/html');
            const topLevelElements = Array.from(innerDoc.body.children).filter(el => {
                const tag = el.tagName.toLowerCase();
                return tag !== 'script' && tag !== 'style' && tag !== 'link' && tag !== 'meta';
            });
            if (topLevelElements.length > 0) {
                sectionElements = topLevelElements;
            }
        }

        // 4.5. Check if wrapped inside .chaigen-wp-container and search inside it
        if (sectionElements.length === 0) {
            const wpContainers = doc.querySelectorAll('.chaigen-wp-container');
            for (const container of Array.from(wpContainers)) {
                // First try direct section descendants of container
                const sectionsInWp = Array.from(container.querySelectorAll(':scope > section'));
                if (sectionsInWp.length > 0) {
                    sectionElements = [...sectionElements, ...sectionsInWp];
                } else {
                    // Try nested section descendants
                    const anySectionsInWp = Array.from(container.querySelectorAll('section'));
                    if (anySectionsInWp.length > 0) {
                        sectionElements = [...sectionElements, ...anySectionsInWp];
                    } else {
                        // Otherwise, fallback directly to top-level clean tags of container (divs, etc.)
                        const childrenInWp = Array.from(container.children).filter(el => {
                            const tag = el.tagName.toLowerCase();
                            return tag !== 'script' && tag !== 'style' && tag !== 'link' && tag !== 'meta';
                        });
                        if (childrenInWp.length > 0) {
                            sectionElements = [...sectionElements, ...childrenInWp];
                        }
                    }
                }
            }
        }

        // 5. Try finding standard sections container or direct <section> children under doc.body
        if (sectionElements.length === 0) {
            const container = doc.getElementById('sections-container') || doc.body;
            sectionElements = Array.from(container.querySelectorAll(':scope > section'));
        }
        
        // 6. Try searching for all sections regardless of nesting level
        if (sectionElements.length === 0) {
            const allSections = Array.from(doc.querySelectorAll('section'));
            if (allSections.length > 0) sectionElements = allSections;
        }

        // 7. General fallback: return all non-metadata root elements under body
        if (sectionElements.length === 0) {
            sectionElements = Array.from(doc.body.children).filter(el => {
                const tag = el.tagName.toLowerCase();
                return tag !== 'script' && tag !== 'style' && tag !== 'link' && tag !== 'meta';
            });
        }

        // Map elements and retrieve injected/fallback metadata
        return sectionElements.map((el, idx) => {
            const firstText = findFirstTextLine(el);
            const fallbackName = firstText ? firstText : `Section ${idx + 1}`;
            const name = el.getAttribute('data-chaigen-name') || fallbackName;
            const description = el.getAttribute('data-chaigen-description') || "Imported Build Section";
            const style = el.getAttribute('data-chaigen-style') || undefined;
            const isTransparent = el.getAttribute('data-chaigen-is-transparent') === 'true';

            // Propagate background colors and general typographic classes of the body tag
            // directly onto individual section root containers to safeguard layout fidelity in isolated views
            if (el instanceof HTMLElement) {
                if (bodyClass) {
                    const bodyClasses = bodyClass.split(/\s+/).filter(Boolean);
                    bodyClasses.forEach(cls => {
                        if (cls.startsWith('text-') || cls.startsWith('selection:') || cls.includes('font-') || cls === 'antialiased') {
                            if (!el.classList.contains(cls)) {
                                el.classList.add(cls);
                            }
                        }
                        if (cls.startsWith('bg-')) {
                            const hasExistingBg = Array.from(el.classList).some(c => c.startsWith('bg-') && c !== 'bg-transparent');
                            if (!hasExistingBg) {
                                el.classList.add(cls);
                            }
                        }
                    });
                }
                if (bodyStyle) {
                    const currentStyle = el.getAttribute('style') || '';
                    el.setAttribute('style', `${bodyStyle}; ${currentStyle}`.trim());
                }
            }

            // Detect background theme if not explicitly specified via metadata attributes
            let detectedThemeMode: 'dark' | 'light' | undefined = undefined;
            const contentString = el.outerHTML.toLowerCase();
            const hasDarkBg = /bg-(?:zinc|slate|neutral|gray|stone)-(?:900|950)|bg-black|bg-\[#0a0a0c\]|bg-\[#050505\]|bg-\[#111114\]|bg-\[#09090b\]/.test(contentString);
            const hasLightBg = /bg-(?:zinc|slate|neutral|gray|stone)-(?:50|100)|bg-white|bg-\[#ffffff\]|bg-\[#fafafa\]|bg-\[#fcfcfc\]/.test(contentString);
            if (hasDarkBg) {
                detectedThemeMode = 'dark';
            } else if (hasLightBg) {
                detectedThemeMode = 'light';
            }

            // Clone to clean and remove internal tracking tags before storing
            const elClone = el.cloneNode(true) as HTMLElement;
            elClone.removeAttribute('data-chaigen-name');
            elClone.removeAttribute('data-chaigen-description');
            elClone.removeAttribute('data-chaigen-style');
            elClone.removeAttribute('data-chaigen-is-transparent');

            let cleanHtml = elClone.outerHTML;

            // Prepend critical head style tags & custom scripts to the first section element so they load correctly inside the preview frame
            if (idx === 0 && extraTagsHtml) {
                cleanHtml = extraTagsHtml + '\n' + cleanHtml;
            }

            return {
                html: cleanHtml,
                originalHtml: cleanHtml,
                name,
                description,
                style,
                isTransparent,
                detectedThemeMode
            };
        });
    } catch (e) {
        console.error("Failed to deconstruct snippet", e);
        return [];
    }
};
