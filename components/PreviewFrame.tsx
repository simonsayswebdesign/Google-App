
import React, { useEffect, useRef } from 'react';

interface PreviewFrameProps {
  title: string;
  children?: React.ReactNode;
  htmlContent?: string;
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({ title, htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getFullHtml = (body: string) => `
    <!DOCTYPE html>
    <html class="scroll-smooth h-full overflow-x-hidden">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Cinzel:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Instrument+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital,wght@0,400;1,400&family=Italiana&family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Share+Tech+Mono&family=Syne:wght@400;500;600;700;800&family=Unbounded:wght@300;400;500;600;700;800;900&family=Urbanist:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
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

          body { 
            font-family: 'Inter', 'Plus Jakarta Sans', sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: transparent;
            -webkit-font-smoothing: antialiased;
            min-height: 100%;
            width: 100%;
            overflow-x: hidden;
          }
          
          /* ATOMIC CLIPPING PROTECTION - MATCHES EXPORT LOGIC */
          
          .bg-clip-text {
            -webkit-background-clip: text !important;
            background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            display: inline-block !important;
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

          /* 
             Balanced Clipping Protection:
             Adds padding to prevent clip, subtracts margin to prevent layout shift.
             This ensures centered text stays centered.
          */
          h1, h2, h3, h4, h5, h6, .italic, .font-serif, .font-black, .bg-clip-text {
            padding-right: 0.15em !important;
            margin-right: -0.15em !important;
            overflow: visible !important;
          }

          #sections-container {
            width: 100%;
            position: relative;
            padding: 0;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          #sections-container > section {
            width: 100%;
            position: relative;
            flex-shrink: 0;
          }

          /* Placeholder Tagging */
          .chai-placeholder-img { outline: 2px dashed rgba(79, 70, 229, 0.2); }
          
          .checkered-bg {
            background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
            background-size: 20px 20px;
          }
          ::-webkit-scrollbar { display: none; }
          svg { overflow: visible !important; }

          /* Scroll-triggered Entrance Animations */
          .animate-paused {
            animation-play-state: paused !important;
          }
          .animate-started {
            animation-play-state: running !important;
          }
        </style>
      </head>
      <body>
        <div id="sections-container" class="w-full min-h-screen">
          ${body}
        </div>

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
      </body>
    </html>
  `;

  useEffect(() => {
    if (iframeRef.current && htmlContent !== undefined) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(getFullHtml(htmlContent));
        doc.close();
      }
    }
  }, [htmlContent]);

  return (
    <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col relative border border-gray-200">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="flex items-center bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{title}</span>
            </div>
            <div className="w-12"></div>
        </div>
        <div className="flex-1 relative bg-white checkered-bg overflow-auto">
            <iframe 
                ref={iframeRef}
                title="Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    </div>
  );
};
