import React, { useState, useMemo } from 'react';
import { GeneratedSection } from '../types';
import { 
  Check, Copy, Download, Sparkles, AlertCircle, RefreshCw, Layers, FileCode, CheckCircle, 
  Smartphone, ExternalLink, ChevronDown, ChevronRight, HelpCircle, Layout, Code, Eye, Settings, Info
} from 'lucide-react';
import { constructFullPageHtml } from '../utils/sectionUtils';

interface WordPressPanelProps {
  sections: GeneratedSection[];
  themeColor?: string;
}

interface DetectedField {
  id: string;
  type: 'text' | 'textarea' | 'image' | 'link';
  label: string;
  original: string;
}

export const WordPressPanel: React.FC<WordPressPanelProps> = ({ sections, themeColor = 'indigo' }) => {
  const exportMode = 'all';
  const [pageKey, setPageKey] = useState<string>('home');
  const [targetPageId, setTargetPageId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '');
  const [copiedType, setCopiedType] = useState<'oxygen_php' | 'oxygen_reg' | 'clean_html' | null>(null);
  const [oxygenSection, setOxygenSection] = useState<'php' | 'register'>('php');

  // Interactive layout states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'section-0': true,
    'section-1': true,
    'type-text': true,
    'type-textarea': true,
    'type-image': true,
    'type-link': true,
  });
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const toggleSectionCollapse = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopySlug = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(slug);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedSection = useMemo(() => {
    return sections.find(s => s.id === selectedSectionId) || sections[0];
  }, [sections, selectedSectionId]);

  // Dynamic field extraction helper for a single section
  const parseSectionFields = (html: string, sectionId: string, sectionName: string, sectionIdx: number) => {
    const fields: DetectedField[] = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const root = doc.body.firstElementChild;
      if (!root) return { fields, templatedHtml: html };

      let hCount = 0;
      let pCount = 0;
      let bCount = 0;
      let iCount = 0;

      const sanitizeSlug = (text: string): string => {
        return text.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 15);
      };

      const sec_suffix = sectionId.substring(0, 4);
      const seenIds = new Set<string>();

      const getUniqueId = (baseId: string): string => {
        let uniqueId = baseId;
        let counter = 1;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${baseId}_${counter}`;
          counter++;
        }
        seenIds.add(uniqueId);
        return uniqueId;
      };

      const walk = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          // 1. Image Handler
          if (tagName === 'img') {
            const src = el.getAttribute('src') || '';
            if (src && !src.startsWith('data:')) {
              iCount++;
              const originalAlt = el.getAttribute('alt') || '';
              const altSlug = sanitizeSlug(originalAlt) || `img_${iCount}`;
              const id = `img_${altSlug}_${sec_suffix}`;
              const uniqueId = getUniqueId(id);
              
              fields.push({
                id: uniqueId,
                type: 'image',
                label: `Image: ${originalAlt ? originalAlt.substring(0, 15) : `Asset #${iCount}`}`,
                original: src,
                sectionName,
                sectionIdx
              } as any);
              el.setAttribute('src', `CHAIGEN_IMAGE_[${uniqueId}]`);
            }
            return; // Stop walking descendants of images
          }

          // 2. Link/Button Handler
          if (tagName === 'a' || tagName === 'button') {
            bCount++;
            const text = el.textContent?.trim() || '';
            const href = el.getAttribute('href') || '#';
            const textSlug = sanitizeSlug(text) || `btn_${bCount}`;

            const textId = `btn_text_${textSlug}_${sec_suffix}`;
            const linkId = `btn_link_${textSlug}_${sec_suffix}`;

            const uniqueTextId = getUniqueId(textId);
            const uniqueLinkId = getUniqueId(linkId);

            fields.push({
              id: uniqueTextId,
              type: 'text',
              label: `Button Label: "${text.substring(0, 15)}"`,
              original: text,
              sectionName,
              sectionIdx
            } as any);

            fields.push({
              id: uniqueLinkId,
              type: 'link',
              label: `Button Link URL`,
              original: href,
              sectionName,
              sectionIdx
            } as any);

            // If it's a <button>, convert it to an <a> to support real href links!
            if (tagName === 'button') {
              const anchor = doc.createElement('a');
              // copy all attributes from button
              Array.from(el.attributes).forEach(attr => {
                anchor.setAttribute(attr.name, attr.value);
              });
              // set text content & href
              anchor.textContent = `CHAIGEN_TEXT_[${uniqueTextId}]`;
              anchor.setAttribute('href', `CHAIGEN_LINK_[${uniqueLinkId}]`);
              // replace element
              el.parentNode?.replaceChild(anchor, el);
            } else {
              el.textContent = `CHAIGEN_TEXT_[${uniqueTextId}]`;
              el.setAttribute('href', `CHAIGEN_LINK_[${uniqueLinkId}]`);
            }
            return; // Stop walking descendants of buttons
          }
        }

        // 3. Text Node Handler (Preserves inner styling tags like spans, gradients, bold, italics, etc.)
        if (node.nodeType === Node.TEXT_NODE) {
          const textVal = node.textContent?.trim() || '';
          // Ignore comments, script blocks, metadata, and tiny fragment values (<=1 chars)
          if (textVal.length > 1 && !textVal.startsWith('CHAIGEN_') && !textVal.startsWith('<!--')) {
            let curr = node.parentNode;
            let type: 'text' | 'textarea' | null = null;
            let conceptLabel = 'Content';

            // Traverse up to find closest semantic parent block
            while (curr && curr !== root) {
              if (curr.nodeType === Node.ELEMENT_NODE) {
                const parentTag = curr.nodeName.toLowerCase();
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(parentTag)) {
                  type = 'text';
                  conceptLabel = 'Heading Line';
                  break;
                }
                if (['p', 'blockquote', 'li'].includes(parentTag)) {
                  type = 'textarea';
                  conceptLabel = 'Paragraph text';
                  break;
                }
                if (parentTag === 'a' || parentTag === 'button') {
                  // Button text, already processed at element level, skip
                  return;
                }
              }
              curr = curr.parentNode;
            }

            // Fallback for text nodes nested outside major blocks
            if (!type) {
              const directParentTag = node.parentNode?.nodeName.toLowerCase();
              if (directParentTag === 'span') {
                type = 'text';
                conceptLabel = 'Text Accent';
              } else {
                type = 'text';
                conceptLabel = 'Block Label';
              }
            }

            if (type === 'text') {
              hCount++;
              const textSlug = sanitizeSlug(textVal) || `head_${hCount}`;
              const id = `title_${textSlug}_${sec_suffix}`;
              const uniqueId = getUniqueId(id);
              fields.push({
                id: uniqueId,
                type: 'text',
                label: `${conceptLabel}: "${textVal.substring(0, 15)}"`,
                original: textVal,
                sectionName,
                sectionIdx
              } as any);
              node.textContent = `CHAIGEN_TEXT_[${uniqueId}]`;
            } else {
              pCount++;
              const textSlug = sanitizeSlug(textVal).substring(0, 12) || `txt_${pCount}`;
              const id = `text_${textSlug}_${sec_suffix}`;
              const uniqueId = getUniqueId(id);
              fields.push({
                id: uniqueId,
                type: 'textarea',
                label: `Paragraph content`,
                original: textVal,
                sectionName,
                sectionIdx
              } as any);
              node.textContent = `CHAIGEN_TEXT_[${uniqueId}]`;
            }
          }
          return;
        }

        if (node.childNodes && node.childNodes.length > 0) {
          Array.from(node.childNodes).forEach(walk);
        }
      };

      walk(root);

      // Convert layout's lg: classes to md: classes to fit mobile & builder sizes
      let processedLayout = root.outerHTML
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
        .replace(/lg:w-\[/g, 'md:w-[')
        .replace(/lg:w-1\//g, 'md:w-1/')
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
        .replace(/lg:bottom-/g, 'md:bottom-');

      return { fields, templatedHtml: processedLayout };
    } catch (e) {
      console.error(e);
      return { fields: [], templatedHtml: html };
    }
  };

  // Dynamic fields parser supporting both single & combined modes
  const parserResults = useMemo(() => {
    if (sections.length === 0) return { fields: [], templatedHtml: '' };

    if (exportMode === 'all') {
      const allFields: DetectedField[] = [];
      const allTemplates: string[] = [];

      sections.forEach((sec, idx) => {
        const { fields: secFields, templatedHtml: secHtml } = parseSectionFields(
          sec.html,
          sec.id,
          sec.name || `Section ${idx + 1}`,
          idx
        );
        allFields.push(...secFields);
        allTemplates.push(`\t<!-- SECTION ${idx + 1}: ${sec.name || 'Block'} -->\n\t` + secHtml);
      });

      return { fields: allFields, templatedHtml: allTemplates.join('\n\n') };
    } else {
      if (!selectedSection) return { fields: [], templatedHtml: '' };
      const sIdx = sections.findIndex(s => s.id === selectedSection.id);
      return parseSectionFields(
        selectedSection.html,
        selectedSection.id,
        selectedSection.name || 'Section Block',
        sIdx !== -1 ? sIdx : 0
      );
    }
  }, [sections, selectedSection, exportMode]);

  const { fields, templatedHtml } = parserResults;

  // Group fields by section for 'all' mode
  const fieldsBySection = useMemo(() => {
    const groups: { name: string; index: number; fields: DetectedField[] }[] = [];
    fields.forEach(f => {
      const sName = f.sectionName || 'Global Block';
      const sIdx = f.sectionIdx !== undefined ? f.sectionIdx : 0;
      let group = groups.find(g => g.index === sIdx && g.name === sName);
      if (!group) {
        group = { name: sName, index: sIdx, fields: [] };
        groups.push(group);
      }
      group.fields.push(f);
    });
    return groups.sort((a, b) => a.index - b.index);
  }, [fields]);

  // Group fields by type for 'single' mode
  const fieldsByType = useMemo(() => {
    const groups: Record<string, { label: string; icon: any; fields: DetectedField[] }> = {
      text: { label: 'Short Text Labels', icon: Code, fields: [] },
      textarea: { label: 'Paragraph Blobs', icon: FileCode, fields: [] },
      image: { label: 'Images & Graphics', icon: Layers, fields: [] },
      link: { label: 'Button Action Links', icon: ExternalLink, fields: [] },
    };
    fields.forEach(f => {
      if (groups[f.type]) {
        groups[f.type].fields.push(f);
      } else {
        groups.text.fields.push(f);
      }
    });
    return Object.entries(groups).filter(([_, g]) => g.fields.length > 0);
  }, [fields]);

  // Code Block Escape helper for safe PHP single quotes
  const escapeSingleQuotes = (str: string | undefined | null) => {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  };

  /**
   * Generates Independent Standalone WordPress Shortcode Plugin with a beautiful dynamic Meta Fields panel
   */
  const shortcodePluginCode = '';
  const unused_shortcodePluginCode = useMemo(() => {
    if (!selectedSection) return '';

    const blockSlug = `chaigen_sec_${selectedSection.id.substring(0, 8).toLowerCase()}`;
    const blockTitle = selectedSection.name || 'Tailwind Section';

    let templateWithPhp = templatedHtml;
    fields.forEach(f => {
      // escape regex special characters in placeholder
      const textPlaceholder = `CHAIGEN_TEXT_[${f.id}]`;
      const linkPlaceholder = `CHAIGEN_LINK_[${f.id}]`;
      const imgPlaceholder = `CHAIGEN_IMAGE_[${f.id}]`;

      const isShortcode = (f.type === 'text' || f.type === 'textarea') && f.original?.includes('[') && f.original?.includes(']');
      const textReplacement = isShortcode
        ? `<?php echo do_shortcode($fields['${f.id}']); ?>`
        : `<?php echo esc_html($fields['${f.id}']); ?>`;

      templateWithPhp = templateWithPhp
        .split(textPlaceholder).join(textReplacement)
        .split(linkPlaceholder).join(`<?php echo esc_url($fields['${f.id}']); ?>`)
        .split(imgPlaceholder).join(`<?php echo esc_url($fields['${f.id}']); ?>`);
    });

    return `<?php
/**
 * Plugin Name: ChaiGen WP - ${escapeSingleQuotes(blockTitle)} Section
 * Description: Fully editable custom-made Tailwind section. No-coding required for clients.
 * Version: 1.0.0
 * Author: Simon Says Web Design
 * Text Domain: chaigen-sections
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 1. ENQUEUE SCRIPTS, FONTS, AND TAILWIND CDN FOR FRONTEND Rendering
 */
function ${blockSlug}_enqueue_styles() {
    wp_enqueue_style( 'google-fonts-chaigen-${selectedSection.id.substring(0, 4)}', 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Instrument+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital,wght@0,400;1,400&family=Italiana&family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Share+Tech+Mono&family=Syne:wght@400;500;600;700;800&family=Unbounded:wght@300;400;500;600;700;800;900&family=Urbanist:wght@300;400;500;600;700;800;900&display=swap', array(), null );
}
add_action( 'wp_enqueue_scripts', '${blockSlug}_enqueue_styles' );

function ${blockSlug}_inject_tailwind_header() {
    ?>
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
    <style>
      /* Stagger delays for premium sequential loading */
      .delay-100 { animation-delay: 100ms !important; }
      .delay-200 { animation-delay: 200ms !important; }
      .delay-300 { animation-delay: 300ms !important; }
      .delay-400 { animation-delay: 400ms !important; }
      .delay-500 { animation-delay: 500ms !important; }
      .delay-700 { animation-delay: 700ms !important; }
      .delay-1000 { animation-delay: 1000ms !important; }

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
      /* UNIVERSAL GRADIENT BORDERS (OXYGEN COMPATIBLE) */
      [class*="border-gradient-"] {
        border: 2px solid transparent !important;
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
                          linear-gradient(to right, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      .border-gradient-to-l {
        background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                          linear-gradient(to left, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      .border-gradient-to-t {
        background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                          linear-gradient(to top, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      .border-gradient-to-b {
        background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                          linear-gradient(to bottom, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      /* Protect buttons and links from WordPress/Oxygen theme default colors and hovers, scoped to layout */
      .chaigen-wp-container a, .chaigen-wp-container button {
        color: inherit;
        text-decoration: none !important;
      }
      .chaigen-wp-container a:hover, .chaigen-wp-container button:hover, .chaigen-wp-container a:focus, .chaigen-wp-container button:focus, .chaigen-wp-container a:active, .chaigen-wp-container button:active, .chaigen-wp-container a:visited {
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
    <?php
}
add_action( 'wp_head', '${blockSlug}_inject_tailwind_header' );

function ${blockSlug}_inject_animations_script() {
    ?>
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
    </script>
    <?php
}
add_action( 'wp_footer', '${blockSlug}_inject_animations_script' );

/**
 * 2. ENQUEUE WORDPRESS NATIVE MEDIA LIBRARY SCRIPT FOR IMAGE SELECTORS
 */
function ${blockSlug}_admin_enqueue_media($hook) {
    if ( $hook == 'post.php' || $hook == 'post-new.php' ) {
        wp_enqueue_media();
        wp_enqueue_style( 'wp-color-picker' );
        wp_enqueue_script( 'wp-color-picker' );
    }
}
add_action( 'admin_enqueue_scripts', '${blockSlug}_admin_enqueue_media' );

/**
 * 3. DECLARE CUSTOM CONTENT FIELDS META BOX FOR THE EDITING PANEL
 */
function ${blockSlug}_add_fields_metabox() {
    add_meta_box(
        '${blockSlug}_metabox',
        '✏️ ChaiGen Editor - ${escapeSingleQuotes(blockTitle)}',
        '${blockSlug}_render_metabox_form',
        array('page', 'post'),
        'normal',
        'high'
    );
}
add_action( 'add_meta_boxes', '${blockSlug}_add_fields_metabox' );

/**
 * 4. RENDERS EDITABLE SETTINGS FORM IN WORDPRESS FOR THE CLIENT
 */
function ${blockSlug}_render_metabox_form($post) {
    wp_nonce_field( '${blockSlug}_save_nonce_action', '${blockSlug}_save_nonce_field' );
    
    // Roster of Fields to parse
    $fields_schema = array(
${fields.map(f => `        '${f.id}' => array(
            'label' => '${escapeSingleQuotes(f.label)}',
            'type'  => '${f.type}',
            'default' => '${escapeSingleQuotes(f.original)}'
        ),`).join('\n')}
    );

    echo '<div style="font-family: -apple-system,BlinkMacSystemFont,\\'Segoe UI\\',Roboto,Oxygen-Sans,Ubuntu,Cantarell,sans-serif; padding: 15px 0;">';
    echo '<p style="color: #64748b; font-size: 13px; margin-bottom: 25px;">Provide contents below. They will immediately style this section on this page.</p>';

    foreach ($fields_schema as $fid => $cfg) {
        $meta_val = get_post_meta($post->ID, '_chaigen_' . $fid, true);
        $curr_val = ($meta_val !== '') ? $meta_val : $cfg['default'];

        echo '<div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px;">';
        echo '<label style="font-weight: 600; font-size: 13px; color: #1e293b;">' . esc_html($cfg['label']) . '</label>';

        if ($cfg['type'] == 'textarea') {
            echo '<textarea name="chaigen_' . esc_attr($fid) . '" rows="4" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 14px; color: #334155;">' . esc_textarea($curr_val) . '</textarea>';
        } else if ($cfg['type'] == 'image') {
            echo '<div style="display: flex; gap: 10px; align-items: center;">';
            echo '<input type="text" id="chaigen_img_field_' . esc_attr($fid) . '" name="chaigen_' . esc_attr($fid) . '" value="' . esc_attr($curr_val) . '" style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 14px; color: #334155;" />';
            echo '<button type="button" class="button button-secondary chaigen-upload-btn" data-target="chaigen_img_field_' . esc_attr($fid) . '">Upload/Select Image</button>';
            echo '</div>';
            if ($curr_val) {
                echo '<img id="preview_chaigen_img_field_' . esc_attr($fid) . '" src="' . esc_url($curr_val) . '" style="max-height: 80px; width: auto; object-fit: cover; border-radius: 6px; outline: 1px solid #e2e8f0; margin-top: 8px; max-width: 250px;" />';
            }
        } else {
            echo '<input type="text" name="chaigen_' . esc_attr($fid) . '" value="' . esc_attr($curr_val) . '" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 14px; color: #334155;" />';
        }
        echo '</div>';
    }

    echo '</div>';
    
    // JS for Media Uploader in metabox
    ?>
    <script type="text/javascript">
    jQuery(document).ready(function($){
        $('.chaigen-upload-btn').click(function(e) {
            e.preventDefault();
            var button = $(this);
            var targetInputId = button.data('target');
            
            var custom_uploader = wp.media({
                title: 'ChaiGen - Select Image',
                button: { text: 'Apply Asset' },
                multiple: false
            }).on('select', function() {
                var attachment = custom_uploader.state().get('selection').first().toJSON();
                $('#' + targetInputId).val(attachment.url);
                $('#preview_' + targetInputId).attr('src', attachment.url);
            }).open();
        });
    });
    </script>
    <?php
}

/**
 * 5. SAVE SUBMITTED DATA FROM THE EDIT BOX SECURELY
 */
function ${blockSlug}_save_post_data($post_id) {
    if ( ! isset( $_POST['${blockSlug}_save_nonce_field'] ) ) return;
    if ( ! wp_verify_nonce( $_POST['${blockSlug}_save_nonce_field'], '${blockSlug}_save_nonce_action' ) ) return;
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    // Field list schema
    $fields_list = array(
${fields.map(f => `        '${f.id}',`).join('\n')}
    );

    foreach ($fields_list as $fid) {
        if ( isset( $_POST['chaigen_' . $fid] ) ) {
            $value = $_POST['chaigen_' . $fid];
            if ($fid == 'btn_link_' || strpos($fid, 'link') !== false) {
                update_post_meta( $post_id, '_chaigen_' . $fid, esc_url_raw( $value ) );
            } else {
                update_post_meta( $post_id, '_chaigen_' . $fid, sanitize_text_field( $value ) );
            }
        }
    }
}
add_action( 'save_post', '${blockSlug}_save_post_data' );

/**
 * 6. REGISTER STANDARD WP [${blockSlug}] SHORTCODE TO DISPLAY THIS LAYOUT ON PAGES
 */
function ${blockSlug}_render_shortcode($atts_override) {
    // Use queried object ID if available to ensure correct page-level content resolution
    $post_id = get_queried_object_id() ?: get_the_ID();
    
    // Fetch values, fall back to schema defaults
    $fields = array();
    $fields_cfg = array(
${fields.map(f => `        '${f.id}' => '${escapeSingleQuotes(f.original)}',`).join('\n')}
    );

    foreach ($fields_cfg as $fid => $def) {
        $meta = get_post_meta($post_id, '_chaigen_' . $fid, true);
        $fields[$fid] = ($meta !== '') ? $meta : $def;
    }

    ob_start();
    ?>
    <!-- START TAILWIND DESIGN LAYOUT -->
    <div class="chaigen-wp-container">
${templateWithPhp}
    </div>
    <!-- END TAILWIND DESIGN LAYOUT -->
    <?php
    return ob_get_clean();
}
add_shortcode( '${blockSlug}', '${blockSlug}_render_shortcode' );
`;
  }, [selectedSection, fields, templatedHtml]);

  /**
   * Generates ACF programmatically registered blocks with the custom block markup
   */
  const acfBlockCode = '';
  const unused_acfBlockCode = useMemo(() => {
    if (!selectedSection) return '';

    const blockSlug = `chaigen_acf_${selectedSection.id.substring(0, 8).toLowerCase()}`;
    const blockTitle = selectedSection.name || 'Tailwind Section';

    let templateWithPhp = templatedHtml;
    fields.forEach(f => {
      const textPlaceholder = `CHAIGEN_TEXT_[${f.id}]`;
      const linkPlaceholder = `CHAIGEN_LINK_[${f.id}]`;
      const imgPlaceholder = `CHAIGEN_IMAGE_[${f.id}]`;

      const isShortcode = (f.type === 'text' || f.type === 'textarea') && f.original?.includes('[') && f.original?.includes(']');
      const textReplacement = isShortcode
        ? `<?php echo do_shortcode($fields['${f.id}']); ?>`
        : `<?php echo esc_html($fields['${f.id}']); ?>`;

      templateWithPhp = templateWithPhp
        .split(textPlaceholder).join(textReplacement)
        .split(linkPlaceholder).join(`<?php echo esc_url($fields['${f.id}']); ?>`)
        .split(imgPlaceholder).join(`<?php echo esc_url($fields['${f.id}']); ?>`);
    });

    return `<?php
/**
 * 1. REGISTER THE ACF BLOCK WITH THE GUTEBERG BLOCKS REPOSITORY
 */
add_action('acf/init', '${blockSlug}_register_block');
function ${blockSlug}_register_block() {
    if( function_exists('acf_register_block_type') ) {
        acf_register_block_type(array(
            'name'              => '${blockSlug}',
            'title'             => __('✏️ Client-Editable: ${escapeSingleQuotes(blockTitle)}'),
            'description'       => __('Created with ChaiGen. Fully editable visuals for clients.'),
            'render_callback'   => '${blockSlug}_render_block_callback',
            'category'          => 'layout',
            'icon'              => 'layout',
            'keywords'          => array( 'tailwind', 'chaigen', 'custom' ),
            'enqueue_style'     => 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Instrument+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital,wght@0,400;1,400&family=Italiana&family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Share+Tech+Mono&family=Syne:wght@400;500;600;700;800&family=Unbounded:wght@300;400;500;600;700;800;900&family=Urbanist:wght@300;400;500;600;700;800;900&display=swap',
        ));
    }
}

/**
 * 2. DEFINE AND REGISTER ALL ACF FIELD DEFINITIONS IN PHP (ZERO XML IMPORTS NEEDED!)
 */
add_action('acf/init', '${blockSlug}_register_fields');
function ${blockSlug}_register_fields() {
    if( function_exists('acf_add_local_field_group') ) {
        acf_add_local_field_group(array(
            'key' => 'group_${blockSlug}',
            'title' => '${escapeSingleQuotes(blockTitle)} Fields',
            'fields' => array (
${fields.map(f => `                array (
                    'key' => 'field_${blockSlug}_${f.id}',
                    'label' => '${escapeSingleQuotes(f.label)}',
                    'name' => '${f.id}',
                    'type' => '${f.type === 'image' ? 'image' : f.type === 'textarea' ? 'textarea' : 'text'}',
                    'default_value' => '${escapeSingleQuotes(f.original)}',
                    'return_format' => '${f.type === 'image' ? 'url' : 'value'}',
                ),`).join('\n')}
            ),
            'location' => array (
                array (
                    array (
                        'param' => 'block',
                        'operator' => '==',
                        'value' => 'acf/${blockSlug}',
                    ),
                ),
            ),
        ));
    }
}

/**
 * 3. BLOCK RENDERING FUNCTION (ENQUEUES TAILWIND FRONTEND LOGIC AS WELL)
 */
function ${blockSlug}_render_block_callback($block, $content = '', $is_preview = false, $post_id = 0) {
    // Inject dynamic script to guarantee Tailwind and CSS classes load beautifully
    if (!wp_script_is('tailwind-cdn', 'enqueued')) {
         echo '<script id="tailwind-cdn" src="https://cdn.tailwindcss.com"></script>';
         echo '<script>
              tailwind.config = {
                important: true,
                darkMode: "class",
                theme: {
                  extend: {
                    fontFamily: { 
                        sans: ["\"Inter\"", "\"Plus Jakarta Sans\"", "system-ui", "-apple-system", "sans-serif"],
                        serif: ["\"Instrument Serif\"", "\"Cormorant Garamond\"", "\"Playfair Display\"", "serif"],
                        mono: ["\"JetBrains Mono\"", "\"IBM Plex Mono\"", "monospace"],
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
         </script>';
         echo '<style>
              /* Stagger delays for premium sequential loading */
              .delay-100 { animation-delay: 100ms !important; }
              .delay-200 { animation-delay: 200ms !important; }
              .delay-300 { animation-delay: 300ms !important; }
              .delay-400 { animation-delay: 400ms !important; }
              .delay-500 { animation-delay: 500ms !important; }
              .delay-700 { animation-delay: 700ms !important; }
              .delay-1000 { animation-delay: 1000ms !important; }

              /* UNIVERSAL GRADIENT BORDERS (OXYGEN COMPATIBLE) */
              [class*="border-gradient-"] {
                border: 2px solid transparent !important;
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
                                  linear-gradient(to right, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              .border-gradient-to-l {
                background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                                  linear-gradient(to left, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              .border-gradient-to-t {
                background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                                  linear-gradient(to top, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              .border-gradient-to-b {
                background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                                  linear-gradient(to bottom, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              /* Protect buttons and links from WordPress/Oxygen theme default colors and hovers */
              .chaigen-wp-container a, .chaigen-wp-container button {
                color: inherit;
                text-decoration: none !important;
              }
              .chaigen-wp-container a:hover, .chaigen-wp-container button:hover, .chaigen-wp-container a:focus, .chaigen-wp-container button:focus, .chaigen-wp-container a:active, .chaigen-wp-container button:active, .chaigen-wp-container a:visited {
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
         </style>';
    }

    // Capture dynamic inputs
    $fields = array();
    $fields_schema = array(
${fields.map(f => `        '${f.id}' => '${escapeSingleQuotes(f.original)}',`).join('\n')}
    );

    foreach ($fields_schema as $fid => $def) {
        $val = function_exists('get_field') ? get_field($fid) : (get_the_ID() ? get_post_meta(get_the_ID(), $fid, true) : null);
        
        // Handle image components recursively if ACF returns Array or ID
        if (strpos($fid, 'img_') === 0 && !empty($val)) {
            if (is_array($val)) {
                if (isset($val['url'])) {
                    $val = $val['url'];
                } elseif (isset($val['sizes']['large'])) {
                    $val = $val['sizes']['large'];
                } elseif (isset($val['sizes']['thumbnail'])) {
                    $val = $val['sizes']['thumbnail'];
                }
            } elseif (is_numeric($val)) {
                $attachment_url = wp_get_attachment_image_url($val, 'full');
                if ($attachment_url) {
                    $val = $attachment_url;
                }
            }
        }
        
        $fields[$fid] = ($val !== null && $val !== false && $val !== '') ? $val : $def;
    }

    ?>
    <!-- START THE SECTOR LAYOUT -->
    <div class="chaigen-wp-container">
${templateWithPhp}
    </div>
    <!-- END THE SECTOR LAYOUT -->
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
    </script>
    <?php
}
`;
  }, [selectedSection, fields, templatedHtml]);

  /**
   * Generates ACF/Oxygen Builder custom PHP & HTML Code Block logic
   */
  const oxygenCodeBlockPhp = useMemo(() => {
    if (sections.length === 0) return '';

    const isAll = exportMode === 'all';
    const blockTitle = isAll ? `All Page Sections Combined (${pageKey})` : (selectedSection?.name || 'Tailwind Section');
    const suffix = isAll ? `all_combined_${pageKey}` : `${selectedSection?.id.substring(0, 4) || 'sec'}_${pageKey}`;

    let templateWithPhp = templatedHtml;
    fields.forEach(f => {
      const textPlaceholder = `CHAIGEN_TEXT_[${f.id}]`;
      const linkPlaceholder = `CHAIGEN_LINK_[${f.id}]`;
      const imgPlaceholder = `CHAIGEN_IMAGE_[${f.id}]`;
      const finalFieldId = `${f.id}_${pageKey}`;

      const isShortcode = (f.type === 'text' || f.type === 'textarea') && f.original?.includes('[') && f.original?.includes(']');
      const textReplacement = isShortcode
        ? `<?php echo do_shortcode($fields['${finalFieldId}']); ?>`
        : `<?php echo esc_html($fields['${finalFieldId}']); ?>`;

      templateWithPhp = templateWithPhp
        .split(textPlaceholder).join(textReplacement)
        .split(linkPlaceholder).join(`<?php echo esc_url($fields['${finalFieldId}']); ?>`)
        .split(imgPlaceholder).join(`<?php echo esc_url($fields['${finalFieldId}']); ?>`);
    });

    return `<?php
/**
 * 1. OXYGEN BUILDER CODE BLOCK (PHP & HTML tab)
 * Paste this code inside your Oxygen Builder "Code Block" element inside the PHP & HTML editor tab.
 * It will automatically search page-level ACF fields using the correct post ID context.
 */

// Bulletproof Page ID resolution in Oxygen Builder templates and queries
$post_id = null;

global $wp_query;
$wp_query_loaded = (isset($wp_query) && $wp_query instanceof WP_Query);

if ($wp_query_loaded) {
    // 1. Try queried object ID first (most reliable on frontend singular views)
    if (is_singular()) {
        $post_id = get_queried_object_id();
    }

    // 2. Fallback to global $post if singular gets bypassed (e.g. inside loops/tabs)
    if (!$post_id) {
        global $post;
        if (isset($post->ID)) {
            $post_id = $post->ID;
        }
    }

    // 3. Fallback to the current queried object ID
    if (!$post_id) {
        $post_id = get_queried_object_id();
    }

    // 4. Default fallback to standard get_the_ID() loop value
    if (!$post_id) {
        $post_id = get_the_ID();
    }
}

// 5. If editing in Oxygen Builder, extract the post parameter from edit screen URL
if (defined('SHOW_CT_BUILDER') || isset($_GET['ct_builder']) || is_admin()) {
    if (isset($_GET['post'])) {
        $post_id = intval($_GET['post']);
    }
}

// Print diagnostic info in HTML comments to make front-end troubleshooting of ACF keys extremely easy!
if ($wp_query_loaded) {
    echo '<!-- CHAIGEN DEBUG: Resolved Post ID = ' . esc_html($post_id ? $post_id : "None") . ' | Main Queried Object ID = ' . esc_html(get_queried_object_id()) . ' | Loop get_the_ID() = ' . esc_html(get_the_ID()) . ' -->';
} else {
    echo '<!-- CHAIGEN DEBUG: Resolved Post ID = ' . esc_html($post_id ? $post_id : "None") . ' | WP Query not fully loaded yet -->';
}

$fields = array();
$fields_schema = array(
${fields.map(f => `    '${f.id}_${pageKey}' => '${escapeSingleQuotes(f.original)}',`).join('\n')}
);

foreach ($fields_schema as $fid => $def) {
    $val = function_exists('get_field') ? get_field($fid, $post_id) : ($post_id ? get_post_meta($post_id, $fid, true) : null);
    
    // Handle image components recursively if ACF returns Array or ID
    if (strpos($fid, 'img_') === 0 && !empty($val)) {
        if (is_array($val)) {
            if (isset($val['url'])) {
                $val = $val['url'];
            } elseif (isset($val['sizes']['large'])) {
                $val = $val['sizes']['large'];
            } elseif (isset($val['sizes']['thumbnail'])) {
                $val = $val['sizes']['thumbnail'];
            }
        } elseif (is_numeric($val)) {
            $attachment_url = wp_get_attachment_image_url($val, 'full');
            if ($attachment_url) {
                $val = $attachment_url;
            }
        }
    }
    
    $fields[$fid] = ($val !== null && $val !== false && $val !== '') ? $val : $def;
}

// Inline enqueue stylesheet logic inside Oxygen frame context
if (!wp_style_is('google-fonts-chaigen-${suffix}', 'enqueued')) {
    echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Instrument+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital,wght@0,400;1,400&family=Italiana&family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Share+Tech+Mono&family=Syne:wght@400;500;600;700;800&family=Unbounded:wght@300;400;500;600;700;800;900&family=Urbanist:wght@300;400;500;600;700;800;900&display=swap" />';
}

// Inject tailwind CSS dynamically to prevent unstyled layouts on frontend
if (true) {
    ?>
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
    <style>
      /* Stagger delays for premium sequential loading */
      .delay-100 { animation-delay: 100ms !important; }
      .delay-200 { animation-delay: 200ms !important; }
      .delay-300 { animation-delay: 300ms !important; }
      .delay-400 { animation-delay: 400ms !important; }
      .delay-500 { animation-delay: 500ms !important; }
      .delay-700 { animation-delay: 700ms !important; }
      .delay-1000 { animation-delay: 1000ms !important; }

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
      /* UNIVERSAL GRADIENT BORDERS (OXYGEN COMPATIBLE) */
      [class*="border-gradient-"] {
        border: 2px solid transparent !important;
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
                          linear-gradient(to right, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      .border-gradient-to-l {
        background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                          linear-gradient(to left, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      .border-gradient-to-t {
        background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                          linear-gradient(to top, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      .border-gradient-to-b {
        background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                          linear-gradient(to bottom, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
      }
      /* Protect buttons and links from WordPress/Oxygen theme default colors and hovers, scoped to layout */
      .chaigen-wp-container a, .chaigen-wp-container button {
        color: inherit;
        text-decoration: none !important;
      }
      .chaigen-wp-container a:hover, .chaigen-wp-container button:hover, .chaigen-wp-container a:focus, .chaigen-wp-container button:focus, .chaigen-wp-container a:active, .chaigen-wp-container button:active, .chaigen-wp-container a:visited {
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
    <?php
}
?>
<!-- START THE TAILWIND LAYOUT -->
<div class="chaigen-wp-container">
${templateWithPhp}
</div>
<!-- END THE TAILWIND LAYOUT -->
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
</script>
`;
  }, [selectedSection, fields, templatedHtml, exportMode, sections, pageKey]);

  /**
   * Generates functions.php fields registration for Oxygen / page-level custom fields
   */
  const oxygenAcfRegisterPhp = useMemo(() => {
    if (sections.length === 0) return '';

    const isAll = exportMode === 'all';
    const blockTitle = isAll ? `All Combined Sections (${pageKey})` : (selectedSection?.name || 'Tailwind Section');
    const groupKeySuffix = pageKey;

    // Build fields array in PHP
    const acfFieldsString: string[] = [];
    let lastSectionIdx = -1;

    fields.forEach(f => {
      if (isAll && f.sectionIdx !== undefined && f.sectionIdx !== lastSectionIdx) {
        lastSectionIdx = f.sectionIdx;
        acfFieldsString.push(`                array (
                    'key' => 'field_chaigen_oxy_tab_sec_${lastSectionIdx}_${pageKey}',
                    'label' => '👉 ${escapeSingleQuotes(f.sectionName || `Section ${lastSectionIdx + 1}`)}',
                    'type' => 'tab',
                    'placement' => 'left',
                    'endpoint' => 0,
                ),`);
      }
      
      const finalFieldId = `${f.id}_${pageKey}`;
      acfFieldsString.push(`                array (
                    'key' => 'field_chaigen_oxy_${groupKeySuffix}_${finalFieldId}',
                    'label' => '${escapeSingleQuotes(f.label)}',
                    'name' => '${finalFieldId}',
                    'type' => '${f.type === 'image' ? 'image' : f.type === 'textarea' ? 'textarea' : 'text'}',
                    'default_value' => '${escapeSingleQuotes(f.original)}',
                    'return_format' => '${f.type === 'image' ? 'url' : 'value'}',
                ),`);
    });

    const idList = targetPageId.split(',').map(s => s.trim()).filter(Boolean);
    let locationRulePhp = '';
    if (idList.length > 0) {
      const rules = idList.map(id => `                array (
                    array (
                        'param' => 'post',
                        'operator' => '==',
                        'value' => '${id}',
                    ),
                ),`);
      locationRulePhp = `            'location' => array (
${rules.join('\n')}
            ),`;
    } else {
      locationRulePhp = `            'location' => array (
                array (
                    array (
                        'param' => 'post',
                        'operator' => '==',
                        'value' => 'REPLACE_WITH_YOUR_PAGE_ID_HERE', // Enter your Page ID here so these fields ONLY show up when editing this specific page!
                    ),
                ),
            ),`;
    }

    return `/**
 * 2. CUSTOM PAGE-LEVEL ACF FIELDS REGISTRATION (Paste in functions.php)
 * Paste this in your child theme's functions.php (or in a plugin like WPCode or Code Snippets)
 * By defining a specific 'post' ID in the location array below, these fields are restricted 
 * exclusively to that page, preventing other pages' content editors from showing these inputs!
 */
add_action('acf/init', 'chaigen_oxy_register_fields_${groupKeySuffix}');
function chaigen_oxy_register_fields_${groupKeySuffix}() {
    if( function_exists('acf_add_local_field_group') ) {
        acf_add_local_field_group(array(
            'key' => 'group_chaigen_oxy_${groupKeySuffix}',
            'title' => '✏️ Client Content Editor: ${escapeSingleQuotes(blockTitle)}',
            'fields' => array (
${acfFieldsString.join('\n')}
            ),
${locationRulePhp}
            'menu_order' => 0,
            'position' => 'normal',
            'style' => 'default',
            'label_placement' => 'top',
            'instruction_placement' => 'label',
            'hide_on_screen' => '',
        ));
    }
}
`;
  }, [selectedSection, fields, exportMode, sections, pageKey, targetPageId]);

  /**
   * Generates native Elementor Widget PHP code for drag and drop WordPress builds
   */
  const elementorWidgetCode = '';
  const unused_elementorWidgetCode = useMemo(() => {
    if (!selectedSection) return '';

    const blockSlug = `chaigen_el_${selectedSection.id.substring(0, 8).toLowerCase()}`;
    const blockClass = `ChaiGen_Elementor_Widget_${selectedSection.id.substring(0, 8)}`;
    const blockTitle = selectedSection.name || 'Tailwind Section';

    let templateWithPhp = templatedHtml;
    fields.forEach(f => {
      const textPlaceholder = `CHAIGEN_TEXT_[${f.id}]`;
      const linkPlaceholder = `CHAIGEN_LINK_[${f.id}]`;
      const imgPlaceholder = `CHAIGEN_IMAGE_[${f.id}]`;

      if (f.type === 'link') {
        templateWithPhp = templateWithPhp.split(linkPlaceholder).join(`<?php echo esc_url($settings['${f.id}']['url']); ?>`);
      } else if (f.type === 'image') {
        templateWithPhp = templateWithPhp.split(imgPlaceholder).join(`<?php echo esc_url($settings['${f.id}']['url']); ?>`);
      } else {
        const isShortcode = (f.type === 'text' || f.type === 'textarea') && f.original?.includes('[') && f.original?.includes(']');
        const textReplacement = isShortcode
          ? `<?php echo do_shortcode($settings['${f.id}']); ?>`
          : `<?php echo esc_html($settings['${f.id}']); ?>`;
        templateWithPhp = templateWithPhp.split(textPlaceholder).join(textReplacement);
      }
    });

    return `<?php
/**
 * Plugin Name: ChaiGen Elementor Widget - ${escapeSingleQuotes(blockTitle)}
 * Description: Registers an Elementor Widget rendering a fully editable, gorgeous Tailwind Layout.
 * Version: 1.0.0
 * Author: Simon Says Web Design
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Hook widget registration
add_action( 'elementor/widgets/register', function( $widgets_manager ) {
    
    class ${blockClass} extends \\Elementor\\Widget_Base {

        public function get_name() {
            return '${blockSlug}';
        }

        public function get_title() {
            return __('🎨 ${escapeSingleQuotes(blockTitle)} (Tailwind)', 'chaigen-sections');
        }

        public function get_icon() {
            return 'eicon-t-letter';
        }

        public function get_categories() {
            return [ 'general' ];
        }

        protected function register_controls() {
            $this->start_controls_section(
                'content_section',
                [
                    'label' => __( 'Edit Field Contents', 'chaigen-sections' ),
                    'tab' => \\Elementor\\Controls_Manager::TAB_CONTENT,
                ]
            );

${fields.map(f => {
  if (f.type === 'image') {
    return `            $this->add_control(
                '${f.id}',
                [
                    'label' => __( '${escapeSingleQuotes(f.label)}', 'chaigen-sections' ),
                    'type' => \\Elementor\\Controls_Manager::MEDIA,
                    'default' => [
                        'url' => '${escapeSingleQuotes(f.original)}',
                    ],
                ]
            );`;
  } else if (f.type === 'link') {
    return `            $this->add_control(
                '${f.id}',
                [
                    'label' => __( '${escapeSingleQuotes(f.label)}', 'chaigen-sections' ),
                    'type' => \\Elementor\\Controls_Manager::URL,
                    'placeholder' => __( 'https://your-link.com', 'chaigen-sections' ),
                    'default' => [
                        'url' => '${escapeSingleQuotes(f.original)}',
                        'is_external' => false,
                        'nofollow' => false,
                    ],
                ]
            );`;
  } else if (f.type === 'textarea') {
    return `            $this->add_control(
                '${f.id}',
                [
                    'label' => __( '${escapeSingleQuotes(f.label)}', 'chaigen-sections' ),
                    'type' => \\Elementor\\Controls_Manager::TEXTAREA,
                    'default' => __( '${escapeSingleQuotes(f.original)}', 'chaigen-sections' ),
                ]
            );`;
  } else {
    return `            $this->add_control(
                '${f.id}',
                [
                    'label' => __( '${escapeSingleQuotes(f.label)}', 'chaigen-sections' ),
                    'type' => \\Elementor\\Controls_Manager::TEXT,
                    'default' => __( '${escapeSingleQuotes(f.original)}', 'chaigen-sections' ),
                ]
            );`;
  }
}).join('\n\n')}

            $this->end_controls_section();
        }

        protected function render() {
            $settings = $this->get_settings_for_display();

            // Inject Tailwind CDN inside elementor page if not already loaded
            ?>
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
            <style>
              /* Stagger delays for premium sequential loading */
              .delay-100 { animation-delay: 100ms !important; }
              .delay-200 { animation-delay: 200ms !important; }
              .delay-300 { animation-delay: 300ms !important; }
              .delay-400 { animation-delay: 400ms !important; }
              .delay-500 { animation-delay: 500ms !important; }
              .delay-700 { animation-delay: 700ms !important; }
              .delay-1000 { animation-delay: 1000ms !important; }

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
              /* UNIVERSAL GRADIENT BORDERS (OXYGEN COMPATIBLE) */
              [class*="border-gradient-"] {
                border: 2px solid transparent !important;
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
                                  linear-gradient(to right, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              .border-gradient-to-l {
                background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                                  linear-gradient(to left, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              .border-gradient-to-t {
                background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                                  linear-gradient(to top, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              .border-gradient-to-b {
                background-image: linear-gradient(var(--bg-fallback, #0a0a0c), var(--bg-fallback, #0a0a0c)), 
                                  linear-gradient(to bottom, var(--tw-gradient-from, #a855f7), var(--tw-gradient-to, #06b6d4)) !important;
              }
              /* Protect buttons and links from WordPress/Oxygen theme default colors and hovers, scoped to layout */
              .chaigen-wp-container a, .chaigen-wp-container button {
                color: inherit;
                text-decoration: none !important;
              }
              .chaigen-wp-container a:hover, .chaigen-wp-container button:hover, .chaigen-wp-container a:focus, .chaigen-wp-container button:focus, .chaigen-wp-container a:active, .chaigen-wp-container button:active, .chaigen-wp-container a:visited {
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

            <!-- START DESIGN CONTENT -->
            <div class="chaigen-wp-container">
${templateWithPhp}
            </div>
            <!-- END DESIGN CONTENT -->
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
            </script>
            <?php
        }
    }

    $widgets_manager->register( new ${blockClass}() );
});
`;
  }, [selectedSection, fields, templatedHtml]);

  // Handle generic copies
  const handleCopyCode = async (code: string, type: 'oxygen_php' | 'oxygen_reg') => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Construct clean HTML without ACF schema or PHP wrappers for user edit workflow
  const cleanHtml = useMemo(() => {
    return sections.map(s => s.html).join('\n\n');
  }, [sections]);

  const handleCopyCleanHtml = async () => {
    try {
      await navigator.clipboard.writeText(cleanHtml);
      setCopiedType('clean_html');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Downloads dynamic single-file Wordpress PHP Plugin
  const handleDownloadPhpFile = (code: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const activeCode = useMemo(() => {
    return oxygenSection === 'php' ? oxygenCodeBlockPhp : oxygenAcfRegisterPhp;
  }, [oxygenSection, oxygenCodeBlockPhp, oxygenAcfRegisterPhp]);

  const downloadFilename = useMemo(() => {
    if (sections.length === 0) return 'wordpress-section.php';
    const isAll = exportMode === 'all';
    const suffix = isAll ? `all-combined-${pageKey}` : `${selectedSection?.id.substring(0, 4) || 'sec'}-${pageKey}`;
    return oxygenSection === 'php' ? `combined-page-template-${suffix}.php` : `acf-registration-${suffix}.php`;
  }, [oxygenSection, selectedSection, exportMode, sections, pageKey]);

  const currentCopyType = useMemo(() => {
    return oxygenSection === 'php' ? 'oxygen_php' : 'oxygen_reg';
  }, [oxygenSection]);

  if (sections.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
        <AlertCircle className="w-12 h-12 text-gray-600 mb-4 animate-bounce" />
        <h4 className="text-lg font-bold text-white uppercase tracking-tight mb-2">No Active Snippets</h4>
        <p className="text-gray-500 text-sm">Generate some blocks on the left first before configuring their WordPress dynamic editors.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      
      {/* CODES GENERATION & TABS */}
      <div className="flex-1 flex flex-col overflow-hidden gap-5">
        
        {/* DATA ARCHITECTURE FLOW (SIMPLIFIER DIAGRAM) */}
        <div className="bg-[#141419] border border-[#222226] p-4 rounded-2xl shrink-0 flex items-center justify-around gap-2 text-center text-xs text-gray-400 flex-wrap md:flex-nowrap">
          <div className="flex flex-col items-center gap-1 flex-1 min-w-[100px]">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm shadow-indigo-500/5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-200 text-[11px] leading-tight">1. Client Edit Form</p>
              <p className="text-[9px] text-gray-500">Non-coders modify page assets</p>
            </div>
          </div>
          
          <div className="text-gray-600 font-mono hidden md:block select-none">────►</div>

          <div className="flex flex-col items-center gap-1 flex-1 min-w-[100px]">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm shadow-amber-500/5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-200 text-[11px] leading-tight">2. ACF Local Schema</p>
              <p className="text-[9px] text-gray-500">Securely stores custom meta</p>
            </div>
          </div>

          <div className="text-gray-600 font-mono hidden md:block select-none">────►</div>

          <div className="flex flex-col items-center gap-1 flex-1 min-w-[100px]">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-200 text-[11px] leading-tight">3. Live Canvas Renders</p>
              <p className="text-[9px] text-gray-500">Tailwind styles loaded dynamically</p>
            </div>
          </div>
        </div>

        {/* PAGE IDENTITY CONFIGURATOR */}
        <div className="bg-[#141419] border border-[#222226] p-5 rounded-2xl shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm shadow-black/25">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase text-gray-200 tracking-wider font-sans">Multi-Page Isolation Settings</h3>
            </div>
            <p className="text-[10px] text-gray-500 max-w-xl leading-relaxed">
              When building multiple pages on a single site, isolate them to prevent overlaps. The <strong>Suffix</strong> keeps keys distinct in the theme database, and the <strong>Page ID</strong> ensures this content editor is only visible on the exact page you specify!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto min-w-[280px] md:min-w-[440px] shrink-0">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block font-sans">1. Unique Page Suffix</span>
                <span className="text-[9px] text-[#4d97ff] font-mono leading-none">acf key suffix</span>
              </div>
              <input
                type="text"
                value={pageKey}
                onChange={(e) => {
                  const cleanVal = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
                  setPageKey(cleanVal || 'home');
                }}
                placeholder="e.g. homepage, about_us"
                className="w-full text-xs font-mono font-bold bg-[#0c0c0e] border border-[#2c2c34] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl h-10 px-3.5 outline-none transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block font-sans">2. WordPress Page ID(s)</span>
                <span className="text-[9px] text-indigo-400 font-mono leading-none">WP Edit Target</span>
              </div>
              <input
                type="text"
                value={targetPageId}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9,\s]/g, '');
                  setTargetPageId(cleanVal);
                }}
                placeholder="e.g. 123 (or 123, 124)"
                className="w-full text-xs font-mono font-bold bg-[#0c0c0e] border border-[#2c2c34] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl h-10 px-3.5 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* DETAILS PANEL & ACTION */}
        <div className="flex-1 flex flex-col bg-[#111114] border border-[#222226] rounded-2xl overflow-hidden relative shadow-lg">
          
          {/* STEPPER METABOX HEADER PROGRESS BAR */}
          <div className="grid grid-cols-2 bg-[#141419] border-b border-[#222226] p-1 shrink-0">
            <button 
              onClick={() => setOxygenSection('php')}
              className={`p-3.5 flex items-center gap-3 transition-all cursor-pointer text-left focus:outline-none ${
                oxygenSection === 'php' 
                  ? `bg-[#181820] border-b-2 border-indigo-500 shadow-inner` 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#141419]/50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono tracking-tight shrink-0 ${
                oxygenSection === 'php' ? 'bg-indigo-600 text-white shadow font-sans' : 'bg-[#1b1b22] text-gray-400'
              }`}>
                01
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block leading-none mb-1">Step 1: Code Block</span>
                <span className={`text-xs font-black truncate block ${oxygenSection === 'php' ? 'text-white' : 'text-gray-400'}`}>PHP & HTML Template</span>
              </div>
            </button>
            <button 
              onClick={() => setOxygenSection('register')}
              className={`p-3.5 flex items-center gap-3 transition-all cursor-pointer text-left focus:outline-none ${
                oxygenSection === 'register' 
                  ? `bg-[#181820] border-b-2 border-indigo-500 shadow-inner` 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#141419]/50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono tracking-tight shrink-0 ${
                oxygenSection === 'register' ? 'bg-indigo-600 text-white shadow font-sans' : 'bg-[#1b1b22] text-gray-400'
              }`}>
                02
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block leading-none mb-1">Step 2: Admin Panel</span>
                <span className={`text-xs font-black truncate block ${oxygenSection === 'register' ? 'text-white' : 'text-gray-400'}`}>functions.php Schema</span>
              </div>
            </button>
          </div>

          {/* EXPORTS CONTROL BAR */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center px-6 py-4 bg-[#141417]/85 border-b border-[#222226] gap-3 shrink-0">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block leading-none mb-1">Target Integration Method</span>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-tight truncate">
                {oxygenSection === 'php' 
                  ? "Oxygen / Bricks Custom Code Block Render Template" 
                  : "WP Theme Schema Field Registrations (functions.php)"}
              </h3>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={handleCopyCleanHtml}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow ${
                  copiedType === 'clean_html'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20 hover:border-amber-500/40'
                }`}
                title="Copies raw, clean Tailwind HTML without PHP wrappers or ACF schemas"
              >
                {copiedType === 'clean_html' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5"/> Copied HTML!
                  </>
                ) : (
                  <>
                    <Code className="w-3.5 h-3.5"/> Copy Clean HTML
                  </>
                )}
              </button>

              <button 
                onClick={() => handleDownloadPhpFile(activeCode, downloadFilename)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#141419] hover:bg-[#16161d] border border-[#2db2ff]/20 hover:border-[#2db2ff]/60 text-[10px] font-black uppercase tracking-widest text-[#2db2ff] rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5"/> Download PHP
              </button>

              <button 
                onClick={() => handleCopyCode(activeCode, currentCopyType)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow ${
                  copiedType === currentCopyType
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35'
                    : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700'
                }`}
              >
                {copiedType === currentCopyType ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5"/> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5"/> Copy Snippet
                  </>
                )}
              </button>
            </div>
          </div>

          {/* DEPLOYMENT CHECKLIST GUIDE */}
          <div className="px-6 py-3.5 bg-[#171720]/80 border-b border-[#222226] text-xs text-gray-300 leading-relaxed flex gap-3 shrink-0">
            <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 mt-0.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
            <div>
              {oxygenSection === 'php' ? (
                <span>
                  <strong>Setup Method</strong>: Paste this script directly inside an <strong>Oxygen Builder or Bricks "Code Block" element</strong> under the <strong>"PHP & HTML" tab</strong>. It captures the local page-level Advanced Custom Fields data, applying responsive fallbacks gracefully without bloated code scripts.
                </span>
              ) : (
                <span>
                  <strong>Client Setup Method</strong>: Insert this snippet inside your child theme's <code>functions.php</code> file (or inside <strong>WPCode / Code Snippets plugin</strong>). This registers custom form layouts in standard Pages & Posts so non-coders can easily edit all images, links, text blocks, and headings cleanly.
                </span>
              )}
            </div>
          </div>

          {/* RENDER CODE EDITOR */}
          <div className="flex-1 overflow-auto p-6 font-mono text-xs text-gray-300 bg-[#0c0c0e] relative scrollbar-hide">
            <div className="absolute top-3 right-4 bg-black/50 backdrop-blur text-[10px] font-bold text-gray-500 border border-gray-800/40 px-2 py-1 rounded font-sans uppercase tracking-wider select-none">
              php
            </div>
            <pre className="whitespace-pre select-all text-[11px] leading-relaxed select-text">
              <code>
                {activeCode}
              </code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
