import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const STYLE_DEFINITIONS: Record<string, string> = {
  "Modern SaaS": "Aesthetic: Linear, Raycast, Vercel. Font: Inter / Plus Jakarta Sans / Instrument Sans. Background: Deep Zinc (#09090b), Neutral Black (#050505), or Deep Violet (#0f0518). Elements: 1px borders (white/10). Tricks: Use Dot patterns, subtle Radial Glows, or Micro-grids. Use `[mask-image:linear-gradient(to_bottom,black,transparent)]` for fading lists. Vibe: Developer perfection. AVOID: Generic Blue.",
  "Neobrutalist": "Aesthetic: Gumroad, Figma. Font: Space Grotesk or Inter (font-sans with bold weights). Background: Stark White (#FFFFFF) or Neon Purple/Pink. Borders: Hard 2px/3px Black (border-black). Shadows: Hard offset (shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]). Interaction: `hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all`. Rounded: rounded-none. Vibe: Bold, raw.",
  "Swiss/International": "Aesthetic: Teenage Engineering, Braun. Font: Inter (ultra-clean weight) / system-ui. Grid: STRICT visible 1px grid lines (border-neutral-200). Typography: Helvetica-style neo-grotesque, massive contrast, tight tracking. Colors: International Orange, Signal Yellow, or Pure Black/White. Rounded: rounded-none. Vibe: Objective, cold, precise, orderly.",
  "Editorial": "Aesthetic: Awwwards Winner, Vogue. Font: Instrument Serif / Cormorant Garamond. Background: Cream (#FDFCF8), Deep Forest Green, or Burgundy. Layout: Asymmetric, overlapping images. Tricks: `mix-blend-difference` text over images. Vibe: Luxury, whitespace.",
  "Glassmorphism": "Aesthetic: macOS, Vision Pro. Font: Inter / Instrument Sans. Background: Abstract mesh gradients (Pink/Purple/Cyan). Cards: `backdrop-blur-xl bg-white/10 border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]`. Vibe: Ethereal, premium.",
  "Retro-futuristic": "Aesthetic: Cyberpunk 2077, Matrix. Font: JetBrains Mono / Space Grotesk. Background: #000000. Accents: Neon Green, Hot Pink, or Electric Blue. Tricks: `drop-shadow-[0_0_10px_rgba(0,255,0,0.8)]` for text glow. Vibe: High-tech low-life.",
  "Bauhaus": "Aesthetic: Geometric Art. Font: Space Grotesk or Inter. Shapes: Circles, Triangles in Primary Blue/Red/Yellow. Layout: Constructivist, diagonal lines. Vibe: Artistic.",
  "Art Deco": "Aesthetic: Great Gatsby. Font: Cinzel or Italiana. Colors: Gold (#D4AF37), Black, Emerald Green. Elements: Decorative double borders, diamond shapes. Vibe: Luxury, Vintage.",
  "Minimal": "Aesthetic: High Fashion, Aesop. Font: Instrument Sans / Inter or Plus Jakarta Sans. Background: White, Off-White (#fafafa), or Soft Stone. Images: Desaturated or B&W. Vibe: Stark, silent.",
  "Flat": "Aesthetic: Duolingo, Old Google. Font: Plus Jakarta Sans / Inter. Background: Solid bright colors (Purple, Green, Orange). Shadows: None. Borders: None. Elements: Simple illustrations. Vibe: Clean, friendly.",
  "Material": "Aesthetic: Google Material 3. Font: Plus Jakarta Sans / Inter. Rounded: rounded-2xl or rounded-full. Shadows: shadow-md or shadow-lg (soft). Ripple effects. Vibe: Tactile, clean.",
  "Neumorphic": "Aesthetic: Soft Plastic. Font: Inter. Background: #E0E5EC. Shadows: shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]. Elements: Extruded look, same color as bg. Vibe: Soft.",
  "Monochromatic": "Aesthetic: Uniform. Font: Inter / Plus Jakarta Sans. Shades of one color (e.g., Emerald-900 to Emerald-50, OR Rose-900 to Rose-50). Vibe: Cohesive.",
  "Scandinavian": "Aesthetic: IKEA, Hay. Font: Inter / Plus Jakarta Sans. Background: Warm White (#FAF9F6), Beige. Elements: Light wood tones, rounded-lg, clean lines. Vibe: Hygge, cozy, airy.",
  "Japandi": "Aesthetic: Muji. Font: Instrument Sans or Cormorant Garamond. Colors: Charcoal, Stone, Bamboo, White. Elements: Low profile, natural textures, black accents on wood. Vibe: Zen, rustic minimalism.",
  "Dark Mode First": "Aesthetic: Linear-Dark. Font: Inter / Plus Jakarta Sans. Background: #0B0C10 or #18181b (Zinc). Gradients: Subtle top-down fades. Tricks: `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-gray-900/0 to-gray-900/0`. Vibe: Premium software.",
  "Modernist": "Aesthetic: Mid-century Modern, Bauhaus, High-Contrast. Font: Space Grotesk (Weight 900 for headings) / Inter. Layout: Strict Grid, Asymmetric Balance. Colors: Off-White (#F7F7F7) or Concrete base. Accents: Primary Red (#DC2626), Cobalt Blue (#2563EB), Chrome Yellow (#FACC15). Elements: BOLD 2px Borders (border-2 border-black), heavy black horizontal rules, zero rounded corners (rounded-none). Vibe: Functional, industrial, bold.",
  "Organic/Fluid": "Aesthetic: Headspace, Duolingo. Font: Plus Jakarta Sans. Shapes: Blobby, rounded-3xl. Colors: Pastel Earth tones (Sage, Ochre, Terracotta). Vibe: Friendly, soft.",
  "Corporate Professional": "Aesthetic: Stripe, Salesforce. Font: Instrument Sans / Plus Jakarta Sans / Inter. Colors: Deep Forest Green, Burgundy, or Slate Grey. Layout: Standard 2-col hero, trust badges. Vibe: Trustworthy, established. Rounded: rounded-none.",
  "Tech Forward": "Aesthetic: Stripe, OpenAI. Font: Space Grotesk headers, IBM Plex Mono body. Graphics: 3D-ish CSS gradients (Purple/Cyan/Orange), glass cards. Vibe: Innovation.",
  "Luxury Minimal": "Aesthetic: Chanel, Rolex. Font: Italiana / Cinzel. Colors: Black, White, Silver/Gold. Layout: Excessive whitespace, center alignment. Vibe: Expensive.",
  "Old Money": "Aesthetic: Ralph Lauren, Ivy League, Country Club. Font: Instrument Serif (font-serif) headings, Plus Jakarta Sans / Inter body. Colors: Deep Navy (#0f172a), Cream (#fdfbf7), Forest Green (#14532d), Burgundy. Elements: 1px gold borders, serif italics. Vibe: Timeless, wealthy, sophisticated.",
  "Neo-Geo": "Aesthetic: 80s Memphis Group. Font: Space Grotesk / Inter. Shapes: Triangles, squiggles, dots. Colors: Bright Pink, Teal, Yellow on Black/White. Vibe: Fun, energetic.",
  "Kinetic": "Aesthetic: High-Performance Digital, System UI, Brutalist. Font: Inter (Weight 900/Black) + IBM Plex Mono / JetBrains Mono. Background: Ultra Dark (#050505). Accents: Neon Cyan #00FFA3 or Hot Orange. Vibe: Precision, Speed, Data. MANDATORY SLANTED ELEMENTS: Buttons, badges, and decorative accents MUST use '-skew-x-12' or 'skew-x-6' transformations. Headers should use 'italic' or 'slant' styles. Elements should feel 'slanted' for a fast, mechanical look.",
  "Gradient Modern": "Aesthetic: Instagram. Font: Inter / Plus Jakarta Sans. Backgrounds: Heavy use of bg-gradient-to-r (Purple to Pink to Orange). Text: Gradient text. Vibe: Vibrant.",
  "Typography First": "Aesthetic: NYT, Kinetic. Font: Instrument Serif (font-serif) + Inter. Layout: Text is the hero. Vibe: Intellectual.",
  "Metropolitan": "Aesthetic: Urban. Font: Inter (Bold/Black) or system-ui. Colors: Concrete Grey, Asphalt Black, Taxi Yellow. Textures: Noise/grain. Vibe: Gritty, bold.",
  "Terminal / CLI": "Aesthetic: Command Line Interface, Hacker. Font: JetBrains Mono / IBM Plex Mono. Background: #000000 or #0D1117. Text: Bright Green (#00ff00) or Amber (#ffb000). Elements: Blinking cursors, ascii art, box borders. Vibe: Technical, raw, geeky.",
  "Y2K / Vaporwave": "Aesthetic: Early 2000s Internet. Font: Space Grotesk / Inter. Colors: Hot Pink, Cyan, Chrome, Holographic gradients. Elements: Windows 95 borders, pixel art vibes, glitches. Vibe: Nostalgic, loud, playful.",
  "Claymorphism": "Aesthetic: Inflated 3D, Meta VR. Font: Inter. Background: Pastel Blue or Purple. Cards: Floating, high-depth double shadows (shadow-[8px_8px_16px_#bba7d1,-8px_-8px_16px_#ffffff]). Rounded: rounded-3xl. Vibe: Friendly, soft, modern."
};

const getSystemInstruction = (
  style?: string, 
  isTransparent?: boolean, 
  themePreference?: 'auto' | 'light' | 'dark' | 'accent',
  hasContext?: boolean,
  animationStyle?: string
) => {
  const baseStyle = style || "Modern SaaS";
  const detailedStyle = STYLE_DEFINITIONS[baseStyle] || `Creatively interpret "${baseStyle}" into a consistent design system.`;

  const isExplicitTheme = themePreference && themePreference !== 'auto';
  let protocolInstruction = '';

  if (hasContext) {
     if (isExplicitTheme) {
        protocolInstruction = `
            🚀 HYBRID CONSISTENCY PROTOCOL:
            - CONTEXT ANCHOR EXISTS (This is the FIRST section of the site).
            - USER REQUESTED A SPECIFIC THEME (${themePreference}).
            - RETAIN: Fonts, Border Radius, spacing, and general layout vibes from the anchor.
            - OVERRIDE: The background and text colors to match the requested '${themePreference}' theme.
            - DISCARD: Specific layout quirks (Vertical text, specific grid layouts) from the anchor.
        `;
     } else {
        protocolInstruction = `
            🚀 VISUAL CONSISTENCY PROTOCOL (ABSOLUTE ANCHOR):
            - You are appending a section to an EXISTING website.
            - THE PROVIDED CONTEXT ANCHOR IS THE ABSOLUTE SOURCE OF TRUTH FOR THE DESIGN SYSTEM.
            - YOU MUST EXTRACT AND REPLICATE:
                1. BACKGROUND THEME: Detect whether the anchor is dark, light, or has a specific color class (e.g., bg-[#0a0a0c], bg-zinc-950, bg-neutral-900, bg-white). YOU MUST USE THE EXACT SAME root background color class/style on the new section to ensure a perfectly seamless look without mismatched section colors.
                2. PRIMARY COLORS: Look at buttons, icons, and accents in the anchor.
                3. TYPOGRAPHY: Match font families (font-sans, font-serif, font-mono) and weights.
                4. BORDER RADIUS: Match 'rounded-*' values exactly for buttons, cards, and images.
                5. SPACING: Match the vertical rhythm (py-*) and container padding.
                6. DESIGN TOKENS: If the anchor uses 'border-white/10', you use 'border-white/10'.
            
            ⚠️ LAYOUT INDEPENDENCE:
            - DO NOT copy the layout structure (e.g. if the anchor is a Hero, don't make another Hero).
            - ONLY copy the *Design DNA* (Colors, Fonts, Shapes).
        `;
     }
  } else {
      if (isExplicitTheme) {
          protocolInstruction = `
            🚀 THEME OBEDIENCE PROTOCOL:
            - User explicitly requested '${themePreference}' theme.
            - IGNORE "Anti-Boredom" color shuffling if it conflicts with this theme.
          `;
      } else {
          protocolInstruction = `
            🚀 ANTI-BOREDOM PROTOCOL (COLOR VARIETY):
            - STOP DEFAULTING TO BLUE/INDIGO.
            - Unless the user prompt EXPLICITLY asks for Blue, you MUST choose a different primary color palette.
            - VALID PALETTES TO ROTATE: Emerald, Violet, Rose, Amber, Cyan, Teal, Fuchsia, or pure Zinc/Neutral.
            - DARK MODES: Don't just use "Dark Blue". Use "Zinc" (Warm Grey), "Neutral" (Pure Grey), or "Deep Violet".
          `;
      }
  }
  return `
    Role: Senior Design Systems Architect & Elite UI Designer.
    Task: Generate breathtaking, high-performance Tailwind CSS components that look like award-winning SaaS landing pages.

    🚀 HIERARCHY OF LAWS:
    1. LAW OF THE ANCHOR (HIGHEST PRIORITY): 
       - If a CONTEXT ANCHOR is provided, IT IS THE IMMUTABLE DESIGN SYSTEM.
       - YOU MUST ADOPT its Border Radius ('rounded-*'), Font Family, Button Styles, and ROOT BACKGROUND COLOR class/style (e.g., bg-[#0a0a0c], bg-zinc-950, bg-white).
       - This OVERRIDES the "Archetype" defaults and guarantees that the appended sections have perfectly matching background colors instead of a different color.
       - EXTRACT the industry/niche from the anchor and maintain it 100%.
    2. LAW OF AUTHENTIC DESIGN TYPOGRAPHY (ANTI-AI-SLOP RULE):
       - YOU MUST ALWAYS prefer clean, extremely professional, balanced sans-serif or system fonts like 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'Space Grotesk', 'Plus Jakarta Sans', or 'Instrument Sans' to prevent an amateur "AI slop" aesthetic.
       - YOU ARE STRICTLY FORBIDDEN FROM DEFAULTING TO OR OVERUSING over-styled "artsy" Google fonts like 'Syne', 'Bricolage Grotesque', 'Unbounded', 'Outfit', or 'Urbanist' unless the user specifically asks for that style or archetype in the current prompt. These fonts look extremely cheap, generated, and "AI-slop"-like when forced into clean professional corporate or SaaS designs.
       - To achieve a highly professional, award-winning look, use clean, classic primary/secondary pairings:
         * Standard Tailwind utility class 'font-sans' resolves to our clean professional standards: 'Inter', 'system-ui', 'BlinkMacSystemFont', 'Plus Jakarta Sans', 'sans-serif'. This is the ultimate, pristine font stack for modern SaaS, apps, startups, and dark modes.
         * Standard Tailwind utility class 'font-serif' resolves to our premium editorial standards: 'Instrument Serif' / 'Cormorant Garamond' / 'Playfair Display'. Perfect for Luxury, Editorial, Premium agency looks.
         * Standard Tailwind utility class 'font-mono' resolves to our dynamic tech standards: 'JetBrains Mono' / 'IBM Plex Mono'. Perfect for high-performance developer tools, code badges, metadata, and numerical metrics.
         * When styling headers or displays, strive for timeless elegance over decorative novelty. Pair clean, heavy Display weights (e.g. tracking-tight or tracking-tighter) with balanced, light, high-legibility body copy.
    3. LAW OF COLOR: Theme Preference (${themePreference || 'AUTO'}) is absolute.
    4. LAW OF NICHE PERSISTENCE: 
       - Keep all copy, imagery descriptions, and feature lists strictly relevant to the niche defined in the anchor.

    🚀 VERTICAL TEXT PROTOCOL (STRICT):
    - OPT-IN ONLY: Do NOT generate vertical text unless the user explicitly asks for "vertical text", "sideways text", or "vertical label" IN THE CURRENT PROMPT.
    - DO NOT INHERIT IT: Even if the Context Anchor has vertical text, the new section MUST NOT have it unless explicitly requested again.
    - NO UPSIDE DOWN TEXT: Never use 'rotate-180' on standard horizontal text.
    - FOR VERTICAL LABELS: Use arbitrary values '[writing-mode:vertical-rl]'.
      * To read BOTTOM-TO-TOP (Standard Side Label): Use '[writing-mode:vertical-rl] rotate-180'.
      * To read TOP-TO-BOTTOM: Use '[writing-mode:vertical-rl]'.
      * AVOID using 'flex-col' to stack single letters (l i k e t h i s). It looks broken.

    ${protocolInstruction}

    🚀 RESPONSIVENESS BIBLE (ABSOLUTE LAW):
    - MOBILE FIRST ARCHITECTURE: All flex layouts must default to 'flex-col' (vertical).
    - LAYOUT SWITCH TIMING (STRICT):
        * OXYGEN BUILDER VIEWPORT IS SMALL (<1000px).
        * YOU MUST USE 'md:' (768px) FOR ALL DESKTOP LAYOUTS.
        * FORBIDDEN: 'lg:flex-row', 'lg:grid-cols-*', 'lg:w-1/2'.
        * REQUIRED: 'md:flex-row', 'md:grid-cols-*', 'md:w-1/2'.
        * EXPLICIT WIDTHS: When using 'md:flex-row', children MUST have explicit widths (e.g. 'md:w-1/2', 'md:w-[45%]', or 'md:flex-1'). Never leave children without width constraints in a horizontal flex container.
        * If you use 'lg:', the user will see the mobile layout in the editor and think it's broken.
    - BUTTON GROUPS:
        * Always use 'flex flex-col sm:flex-row gap-4'.
        * This allows buttons to be side-by-side on larger phones and tablets, preventing the "stacked giant buttons" look.
    - CONTAINER DISCIPLINE (CRITICAL - DO NOT FAIL THIS):
        * Tailwind v4 'container' has NO padding. You MUST add 'px-4 md:px-6 lg:px-8' to the container element.
        * STANDARD WIDTH (NON-FULL-WIDTH): Use 'max-w-[1320px] 2xl:max-w-[1536px]'.
        * FULL-WIDTH EXCEPTION: For styles like 'Swiss/International', 'Modernist', 'Terminal', or 'Kinetic', you may use 'max-w-none' or full-bleed layouts if it fits the aesthetic.
        * Structure: <section class="w-full relative"><div class="container mx-auto px-4 md:px-6 lg:px-8 max-w-[1320px] 2xl:max-w-[1536px]">...</div></section>
        * FORBIDDEN: Do NOT use 'max-w-screen-xl', 'max-w-6xl', 'max-w-5xl', or 'max-w-7xl' unless specifically requested. ONLY 'max-w-[1320px] 2xl:max-w-[1536px]' is the standard.
        * NEVER rely on default padding. ALWAYS write 'px-4' or larger.
        * If the section is full-width (e.g. hero image), the INNER content wrapper must still have 'px-4' and 'max-w-[1320px] 2xl:max-w-[1536px]'.
        * PIXEL PERFECT RULE: If you use 'container', you MUST use 'px-4 md:px-6 lg:px-8' and 'max-w-[1320px] 2xl:max-w-[1536px]'. NO EXCEPTIONS. ANY VARIATION IN WIDTH IS A FAILURE.
        * CONSISTENCY: If a Context Anchor is provided, you MUST match its container width exactly. Since we enforce 1320px, this should be automatic.
        * INNER WIDTHS: Ignore 'max-w-*' classes on inner elements (like <h1> or <p>) when determining the section's global width. Only the main content wrapper's width matters for alignment.
    - NO ABSOLUTE OVERLAP: Do NOT use absolute positioning for critical content (text/buttons). 
        * If creating floating UI cards, use CSS Grid stacking (col-start-1 row-start-1) or stack them normally on mobile.
        * Absolute elements MUST be decorative only or have 'hidden md:block'.
    - TEXT WRAPPING: Use 'max-w-xl', 'max-w-3xl' etc. on text blocks. Never let paragraph text run full width on a desktop monitor.
    - IMAGE SAFETY: All images must have 'w-full h-auto object-cover'. Never hardcode width in pixels.
    - VERTICAL RHYTHM: Use 'py-20 md:py-32' (except header overlay sections) to ensure content looks elite, spacious, and extremely professional.

    🚀 MODERN CSS TRICKS (MANDATORY ENHANCEMENTS):
    - BACKGROUND PATTERNS (ROTATE THESE - DO NOT ALWAYS USE GRIDS):
      * Option A (Standard Grid): 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]'.
      * Option B (Dot Pattern): 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]' (Opacity 0.1 for black canvas or dark modes).
      * Option C (Gradient Mesh): 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-900/0 to-slate-900/0'.
      * Option D (Micro-Stripes): 'bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.02)_0px,rgba(0,0,0,0.02)_2px,transparent_2px,transparent_8px)]'.
      * Option E (Clean): Solid background with minimal gradients, focusing on whitespace/darkspace.
    - GLASSMORPHISM: Use 'backdrop-blur-xl bg-white/5 border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' for high-end cards.
    - TEXT GRADIENTS: Use 'bg-clip-text text-transparent bg-gradient-to-r' for hero headings.
    - GRADIENT BORDERS (OXYGEN/PINEGROW COMPATIBLE): To style buttons or containers with a gradient border, use the custom 'border-gradient-to-r' utility class. To ensure compatibility with layouts in visual editors like Pinegrow or Oxygen, you MUST add inline styles mapping '--tw-gradient-from', '--tw-gradient-to', '--gradient-from', and '--gradient-to' to the actual colors of your gradient, and pair with [--bg-fallback:#HEX_BG_COLOR]. Example: '<button class="border-gradient-to-r from-purple-500 to-cyan-500 [--bg-fallback:#050505] rounded-full px-5 py-2 text-white font-bold" style="--tw-gradient-from: #a855f7; --tw-gradient-to: #06b6d4; --gradient-from: #a855f7; --gradient-to: #06b6d4;">Button Text</button>'.
    - BENTO GRIDS: Use 'grid grid-cols-1 md:grid-cols-4 gap-4' with 'col-span-2 row-span-2' for dashboard-style layouts.
    - MASKING: Use '[mask-image:linear-gradient(to_bottom,black,transparent)]' for fading long lists or backgrounds.
    - ANIMATIONS (PURE-CSS ONLY): ${
      animationStyle === 'none' 
      ? "Do NOT include any entry or fade-in animations on components. Keep elements strictly static." 
      : animationStyle === 'fade'
      ? "You MUST apply 'animate-fade-in' to components or cards with stagger delays (e.g., 'delay-100', 'delay-200', 'delay-300') on text elements/cards."
      : animationStyle === 'slide-up'
      ? "You MUST apply 'animate-fade-in-up' to items like cards, headings, grids, or buttons for a sleek slide-up entrance, staggered using 'delay-100', 'delay-200', etc."
      : animationStyle === 'slide-down'
      ? "You MUST apply 'animate-fade-in-down' to items like headings or top-level list items for a clean glide-down entrance, staggered with delay classes."
      : animationStyle === 'zoom'
      ? "You MUST apply 'animate-zoom-in' to visual card grids, badges, icons, or visual highlights for an organic pop scale-up on entry, staggered with delay classes."
      : animationStyle === 'reveal'
      ? "You MUST apply 'animate-reveal' (uses a clip-path sliding reveal) to bold headlines, text paragraphs, or visual images to slide/wipe them open beautifully, staggered with delays."
      : "By default, apply subtle entrance animations like 'animate-fade-in-up' to headers and key body elements, staggered using delay utility classes ('delay-100', 'delay-200'). IMAGES MUST BE STATIC (No 'animate-float' or 'animate-pulse')."
    }
    - ABSOLUTE BAN ON GSAP: You are STRICTLY FORBIDDEN from generating, loading, or suggesting any GSAP (GreenSock Animation Platform), ScrollTrigger, or third-party JavaScript animation libraries. All animations MUST rely strictly on standard CSS transitions, native Tailwind utility classes, and our vanilla JS IntersectionObserver.
    - INTERACTION: Use 'group-hover:scale-[1.02] transition-all duration-300' for cards.

    🚀 HIGH-DEFINITION & HIGH-FIDELITY DESIGN PROTOCOL (HD MANDATE):
    - NO LAZY CONTAINERS: Every card, section, grid, and text block must look absolute premium on a Retina display.
    - VISUAL MOCKUPS & INTERACTIVE GRAPHICS: Avoid single-colored background shapes or plain empty divs inside sections.
      * If creating a software feature, design a gorgeous, live-feeling app mockup panel or dashboard using pure Tailwind CSS: add a dark title-bar with styled traffic lights (red, yellow, green window circles), a sidebar list, subtle active-line highlight indicators, and simulated stats/graphs.
      * Use real inline SVGs or detailed icons from Lucide SVG styled with beautiful gradients or flowing shadows for custom interactive illustrations.
      * Add subtle shadow rings, glass highlights, and beautiful mesh grids to give UI cards absolute physical presence and premium depth.
    - DECORATIVE GRID LINES: Anchor visual areas with 1px border lines, thin divider panels, and glowing circular dots representing terminal ports, code badges, or dynamic tags.
    - HIGH-FIDELITY HEROES: Always feature a visual center. Pair bold, massive titles with an elaborate, beautifully aligned visual mockup, database schema, workflow timeline, or dynamic grid.
    - COPYWRITING EXCELLENCE: Write extremely persuasive, contextual, real headings, specific technical features, and realistic stats. No mock placeholder blocks or generic statements.
    - MODERN DETAILED BENTOS: If generating bento components, make each box a distinctive element:
      * One box shows active user avatars with ratings, another has a realistic interactive live chart/line, another has an inline mini terminal or schema drawer, and another has a list tracker. This gives an overwhelming sense of premium production completeness.
    - ICON BADGES: Prepend titles or key tags with tiny, high-contrast, rounded-full border-gradient badges carrying micro-monochrome labels. (e.g., 'CORE API_3' or 'SECURE ENGINE' in Courier-like mono typeface).
    - SPACING RHYTHM: Create visual breathing room. Break walls of text with custom styled horizontal grid bars. Ensure buttons have realistic padding, crisp shadows, and a solid premium feel.

    🚀 BUILDER COMPATIBILITY (STANDALONE / OXYGEN):
    - EXPORT MODE: The system now injects Tailwind CDN automatically.
    - Root must be a <section> with classes: 'w-full relative overflow-hidden'.
    - ENSURE all text has explicit colors (e.g. text-slate-900 or text-white) to override Builder defaults.
    - LINKS: Always add 'no-underline' and explicit colors to <a> tags.
    - IMAGES: Use standard <img> tags with 'w-full h-auto object-cover'.
    - Avoid using 'h-screen'; use 'min-h-screen' or 'py-24'.
    - Use standard Tailwind utility classes. Arbitrary values (e.g. bg-[...]) are supported via the injected CDN.

    🚀 STYLE SPECIFICATION:
    ARCHETYPE: "${baseStyle}"
    RULES: ${detailedStyle}

    🚀 THEME EXECUTION:
    - ${themePreference === 'light' ? 'FORCE LIGHT: bg-white or bg-gray-50. Text slate-900. Border gray-200. NO DARK BACKGROUNDS.' : ''}
    - ${themePreference === 'dark' ? 'FORCE DARK: bg-zinc-950 or bg-neutral-950. Text white. Border white/10. NO WHITE BACKGROUNDS.' : ''}
    - ${themePreference === 'accent' ? 'FORCE ACCENT: The main background must be a strong vibrant color (e.g. bg-indigo-600, bg-emerald-600, bg-rose-600). Text white/inverted.' : ''}
    - ${isTransparent ? 'TRANSPARENCY: Root bg-transparent.' : ''}

    Output format: JSON { "html": string, "name": string, "description": string }
  `;
};

const robustParseJson = (text: string) => {
    // 1. Try standard JSON.parse
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn("[robustParseJson] Initial JSON.parse failed, attempting repair...", e);
    }

    // 2. Clear any markdown wrappers if any
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    // Try parsing the cleaned text
    try {
        return JSON.parse(cleaned);
    } catch (e) {}

    // 3. Fallback: Parse using a regex-based property extractor
    try {
        let htmlVal = "";
        let nameVal = "Untitled Section";
        let descVal = "No description provided.";

        // Extract "name"
        const nameMatch = cleaned.match(/"name"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/);
        if (nameMatch) {
            nameVal = nameMatch[1];
        }

        // Extract "description"
        const descMatch = cleaned.match(/"description"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/);
        if (descMatch) {
            descVal = descMatch[1];
        }

        // Extract "html" - matches double quotes up to the next JSON property key name or description
        const htmlMatch = cleaned.match(/"html"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:name|description)"\s*:/) 
                       || cleaned.match(/"html"\s*:\s*"([\s\S]*?)"\s*\}\s*$/);
                       
        if (htmlMatch) {
            htmlVal = htmlMatch[1];
        } else {
            const crudeHtmlMatch = cleaned.match(/"html"\s*:\s*"([\s\S]*?)"\s*$/) || cleaned.match(/"html"\s*:\s*"([\s\S]*)$/);
            if (crudeHtmlMatch) {
                let tempHtml = crudeHtmlMatch[1];
                tempHtml = tempHtml.replace(/",\s*"name"\s*:[\s\S]*$/, "");
                tempHtml = tempHtml.replace(/",\s*"description"\s*:[\s\S]*$/, "");
                tempHtml = tempHtml.replace(/"\s*\}\s*$/, "");
                htmlVal = tempHtml;
            }
        }

        const unescapeString = (str: string) => {
            return str
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\');
        };

        if (htmlVal) {
            return {
                html: unescapeString(htmlVal),
                name: unescapeString(nameVal),
                description: unescapeString(descVal)
            };
        }
    } catch (err) {
        console.error("[robustParseJson] Regex fallback parsing failed:", err);
    }

    throw new Error("The AI response was not in a valid format. Please try again.");
};

const robustParseFullPageJson = (text: string) => {
    // 1. Try standard JSON.parse
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn("[robustParseFullPageJson] Initial JSON.parse failed, attempting repair...", e);
    }

    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {}

    // 2. Parse using a regex-based block extractor for each candidate section
    try {
        const sectionsList: any[] = [];
        const sectionRegex = /\{\s*"html"\s*:([\s\S]*?)\}/g;
        let match;
        
        while ((match = sectionRegex.exec(cleaned)) !== null) {
            const rawSectionInner = match[1];
            
            let htmlVal = "";
            let nameVal = "Untitled Section";
            let descVal = "No description provided.";
            
            const nameM = rawSectionInner.match(/"name"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*$)/);
            if (nameM) nameVal = nameM[1];
            
            const descM = rawSectionInner.match(/"description"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*$)/);
            if (descM) descVal = descM[1];
            
            const htmlM = rawSectionInner.match(/^\s*"([\s\S]*?)"\s*,\s*"(?:name|description)"\s*:/);
            if (htmlM) {
                htmlVal = htmlM[1];
            } else {
                const crudeM = rawSectionInner.match(/^\s*"([\s\S]*)/);
                if (crudeM) {
                    let tempHtml = crudeM[1];
                    tempHtml = tempHtml.replace(/"\s*,\s*"name"\s*:[\s\S]*$/, "");
                    tempHtml = tempHtml.replace(/"\s*,\s*"description"\s*:[\s\S]*$/, "");
                    htmlVal = tempHtml;
                }
            }
            
            const unescapeString = (str: string) => {
                return str
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\\/g, '\\');
            };
            
            sectionsList.push({
                html: unescapeString(htmlVal),
                name: unescapeString(nameVal),
                description: unescapeString(descVal)
            });
        }
        
        if (sectionsList.length > 0) {
            return { sections: sectionsList };
        }
    } catch (err) {
        console.error("[robustParseFullPageJson] Regex fallback parsing failed:", err);
    }

    throw new Error("The AI response was not in a valid format. Please try again.");
};

async function generateWithRetry(
  ai: any,
  params: { model: string; contents: any; config: any },
  maxRetries = 2
): Promise<string> {
  const modelsToTry: string[] = [params.model];
  
  // Choose standard valid text models to try sequentially
  if (params.model === "gemini-3.5-flash") {
    modelsToTry.push("gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-flash-latest");
  } else if (params.model === "gemini-3.1-flash-lite") {
    modelsToTry.push("gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-flash-latest");
  } else {
    // Standard robust fallback sequence
    if (!modelsToTry.includes("gemini-3.5-flash")) modelsToTry.push("gemini-3.5-flash");
    if (!modelsToTry.includes("gemini-3.1-flash-lite")) modelsToTry.push("gemini-3.1-flash-lite");
    if (!modelsToTry.includes("gemini-flash-latest")) modelsToTry.push("gemini-flash-latest");
  }

  let lastError: any;
  let delay = 1000;

  for (const currentModel of modelsToTry) {
    const modelConfig = { ...params.config };
    // Clear thinkingConfig if the current model doesn't support it
    if (!currentModel.startsWith("gemini-3")) {
      delete modelConfig.thinkingConfig;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini SDK] Trying model ${currentModel} (Attempt ${attempt}/${maxRetries})...`);
        const responseStream = await ai.models.generateContentStream({
          ...params,
          model: currentModel,
          config: modelConfig
        });

        let text = "";
        for await (const chunk of responseStream) {
          if (chunk.text) {
            text += chunk.text;
          }
        }
        
        if (text) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini SDK] Model ${currentModel} (Attempt ${attempt}) failed with error:`, err.message || err);

        // Immediate fail fast for configuration, auth, or not found errors
        const isFatalStatus = err.status === 401 || err.status === 403 || err.status === 404;
        if (isFatalStatus) {
          throw err;
        }

        // Fast-failover for overloaded/high-demand models (503 UNAVAILABLE)
        const isHighDemand = err.status === 503 || 
                             (err.message && (
                               err.message.includes("503") || 
                               err.message.toLowerCase().includes("unavailable") || 
                               err.message.toLowerCase().includes("high demand")
                             ));

        if (isHighDemand) {
          console.warn(`[Gemini SDK] Model ${currentModel} is experiencing high demand (503). Skipping further retries and falling back to the next model...`);
          break; // Exit the attempt loop to try the next model immediately
        }

        if (attempt < maxRetries) {
          const backoff = delay * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
          console.log(`[Gemini SDK] Waiting ${Math.round(backoff)}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }
    console.warn(`[Gemini SDK] Model ${currentModel} failed or skipped. Trying next fallback...`);
  }

  throw lastError || new Error("Failed to generate content after retries and fallbacks");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS support for requests from static hosting platforms (like Netlify, Vercel, GitHub Pages)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Gemini-API-Key, X-Gemini-Key, x-gemini-api-key, x-gemini-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parsers
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // API endpoints
  app.post('/api/generate-section', async (req, res) => {
    try {
      const { prompt, options } = req.body;
      const apiKey = (req.headers['x-gemini-api-key'] as string) || 
                     (req.headers['x-gemini-key'] as string) || 
                     req.body.subscriberApiKey || 
                     process.env.GEMINI_API_KEY || 
                     process.env.API_KEY;

      if (!apiKey || apiKey === "undefined") {
        return res.status(400).json({ error: "No Gemini API Key found. Please add your key in the Subscriber API Key settings box." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const parts: any[] = [];
      
      if (options?.image) {
        const matches = options.image.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({ 
            inlineData: { 
              mimeType: matches[1], 
              data: matches[2] 
            } 
          });
        }
      }

      let contextPart = "";
      if (options?.referenceHtml) {
        contextPart = `
            CONTEXT ANCHOR (THE DESIGN DNA SOURCE):
            \`\`\`html
            ${options.referenceHtml.substring(0, 4000)}
            \`\`\`
            
            🚨 ANCHOR INSTRUCTIONS:
            - The HTML above is the FIRST SECTION of the website. It defines the entire Design System.
            - EXTRACT: 'rounded-*' values, font families, primary/secondary colors, and border styles.
            - REPLICATE: Use these exact tokens in the new section to ensure 100% visual consistency.
            - MAINTAIN: The industry/niche and tone of voice.
        `;
      }

      parts.push({ 
        text: `
          ${contextPart}
          TASK: Generate a new section for: "${prompt}"
          ARCHETYPE: "${options?.style || 'Modern SaaS'}"
          THEME: ${options?.themePreference || 'AUTO'}
        `
      });

      const modelToUse = options?.model || "gemini-3.5-flash";
      const config: any = {
        systemInstruction: getSystemInstruction(options?.style, options?.isTransparent, options?.themePreference, !!options?.referenceHtml, options?.animationStyle),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            html: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["html", "name", "description"],
        },
      };

      // Set thinking level configuration only if model is NOT a pro series reasoning model
      if (modelToUse.includes("pro") || modelToUse.includes("image")) {
        // Leave thinking configurations untangled to guarantee maximum template generation logic
      } else if (modelToUse.startsWith("gemini-3")) {
         // Default flash configurations if needed to bypass any thinking step latency structure
         config.thinkingConfig = { thinkingLevel: "LOW" };
      }

      console.log(`[Server] Generating section with model: ${modelToUse}`);
      req.socket.setTimeout(300000); // 5 minutes socket timeout

      const fullText = await generateWithRetry(ai, {
        model: modelToUse,
        contents: { parts },
        config
      });

      console.log(`[Server] Successfully generated section text of length ${fullText.length}. Parsing...`);
      const parsed = robustParseJson(fullText);
      res.json(parsed);

    } catch (err: any) {
      console.error("[Server API Error]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "An error occurred during section generation" });
      } else {
        res.end();
      }
    }
  });

  app.post('/api/generate-full-page', async (req, res) => {
    try {
      const { prompt, style, isTransparent, themePreference, anchorHtml, model, animationStyle } = req.body;
      const apiKey = (req.headers['x-gemini-api-key'] as string) || 
                     (req.headers['x-gemini-key'] as string) || 
                     req.body.subscriberApiKey || 
                     process.env.GEMINI_API_KEY || 
                     process.env.API_KEY;

      if (!apiKey || apiKey === "undefined") {
        return res.status(400).json({ error: "No Gemini API Key found. Please add your key in the Subscriber API Key settings box." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let contextPart = "";
      if (anchorHtml) {
        contextPart = `
            CONTEXT ANCHOR (THE DESIGN DNA SOURCE):
            \`\`\`html
            ${anchorHtml.substring(0, 4000)}
            \`\`\`
            
            🚨 ANCHOR INSTRUCTIONS:
            - The HTML above is the FIRST SECTION of the website. It defines the entire Design System.
            - EXTRACT: 'rounded-*' values, font families, primary/secondary colors, and border styles.
            - REPLICATE: Use these exact tokens in ALL generated sections to ensure 100% visual consistency.
            - MAINTAIN: The industry/niche and tone of voice.
        `;
      }

      const promptText = `
        ${contextPart}
        TASK: Design a highly conversion-optimized, professional, and visually stunning landing page for: "${prompt}"
        ARCHETYPE: "${style || 'Modern SaaS'}"
        THEME: ${themePreference || 'AUTO'}

        You MUST generate exactly 5 sections that represent a complete, premium marketing funnel. All 5 sections must feel like part of a single unified production-ready product with consistent typography, color palettes, visual tokens, and borders.
        
        ⚠️ IMPORTANT RULES FOR ALL SECTIONS:
        1. COPYWRITING: Write rich, compelling, highly contextual copy for "${prompt}". DO NOT use generic "Lorem Ipsum", "Coming soon", or developer placeholders like "Feature title". Write real headlines, realistic feature bullet descriptions, persuasive pricing structures, and authentic-sounding customer names/companies.
        2. ASYMMETRICAL MODERN GRAPHICS: Use purely styled HTML/CSS visuals to simulate live dashboards, rich cards, graphs, metrics, or mockups. Add glowing highlights (\`bg-gradient-to-tr from-cyan-500/10 via-indigo-500/0\`), mesh borders, dot background patterns (\`bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:16px_16px]\`), or custom 1px grid structures.
        3. REAL HIGH-FIDELITY IMAGES: For custom photos, use premium Unsplash URLs corresponding to the niche (e.g. tech, design: \`tech\`, \`laptop\`, \`office\`, or portraits for testimonials). Add \`referrerPolicy="no-referrer"\` and ensure sizes/positions are fully responsive.
        4. OUTSTANDING MOBILITY: Ensure grid cols, padding, and alignments stack flawlessly on mobile (\`flex-col md:flex-row\`, \`grid-cols-1 md:grid-cols-3\`). Keep vertical padding generous: \`py-16 md:py-28\` so elements never feel cramped.

        --- SECTION SEQUENCE TO GENERATE (Must return exactly 5 items in the JSON array) ---

        - Section 1: "Hero Section with Navigation Overlay & Tech-Forward Visual"
          - Header Overlay: At the very top, embed an elegant floating navbar UI (logo, modern links like 'Features', 'Pricing', 'Docs' styled as clean inline-flex links, and a premium "Get Started" call-to-action button).
          - Hero Body: Giant display headline (e.g. \`text-4xl md:text-6xl font-bold tracking-tight\`) using custom styled typography, highly polished primary and auxiliary button group (with hover transitions, gradient outlines, and custom cursor animations).
          - Showcase Preview: A stunning, large, styled dashboard mockup or visual teaser box below the hero copy showcasing interactive items, list details or dynamic interface panels with pure Tailwind CSS charts and glowing radial grids.

        - Section 2: "Trust Indicators & Asymmetric Bento Grid Features"
          - Trust Bar: A horizontal marquee styled with subtle icons/monochrome logos of 4-5 leading tech partners (e.g., Vercel, Stripe, Linear, Supabase) with real-world label styles.
          - Feature Grid: A 3-column or asymmetrical 4-box bento grid showcasing specific modern core capabilities of the app using hover elevations (\`hover:translate-y-[-4.px] transition-all duration-300\`), grid spans, and beautiful translucent border glassmorphisms.

        - Section 3: "Immersive Workspace / Workflow Interactive Showcase"
          - Interactive Layout: A dual-column split section (\`flex-col md:flex-row gap-12\`).
          - Left Column: A premium vertical workflow step tracker or clean tabbed lists outlining the core methodology, using sequential numbered beads or timeline dots.
          - Right Column: An outstanding, live-feeling visual application viewport. Design a gorgeous mockup window with top title bars, directory list sidebar, and dynamic content cards (representing live statistics, charts, file pipelines, or preview elements) styled with high attention to detail.

        - Section 4: "Premium Micro-Testimonials Grid & Tiered Pricing Matrix"
          - Testimonials: A 2-column masonry grid of authentic feedback with circular reader avatars, high-impact titles, and real company designations.
          - Pricing Structure: Next to or below it, construct 3 tiered subscription cards (e.g., Sandbox, Scale, Enterprise) mapping out real product feature lists with custom bullet checkmarks. Highlight the 'Scale' or central card with a gorgeous gradient stroke, custom layout badges (e.g., 'MOST POPULAR'), and responsive button interfaces.

        - Section 5: "Final Conversion CTA Banner & Modular Directory Footer"
          - Bold Closing CTA: A high-contrast premium callout card with an eye-catching background radial mesh, centering a conversion-oriented title, optional email submission field, and heavy secondary action link.
          - Integrated Detailed Footer: A massive site footer underneath featuring multiple column directory structures (Product, Resources, Company, Legal links, social media badges, a logo replica, and clean copyright text built for native enterprise structures).
      `;

      const modelToUse = model || "gemini-3.5-flash";
      const config: any = {
        systemInstruction: getSystemInstruction(style, isTransparent, themePreference, !!anchorHtml, animationStyle),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  html: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["html", "name", "description"],
              }
            }
          },
          required: ["sections"],
        },
      };

      if (modelToUse.startsWith("gemini-3") && !modelToUse.includes("pro")) {
         config.thinkingConfig = { thinkingLevel: "LOW" };
      }

      console.log(`[Server] Generating full page with model: ${modelToUse}`);
      req.socket.setTimeout(300000); // 5 minutes socket timeout

      const fullText = await generateWithRetry(ai, {
        model: modelToUse,
        contents: [{ text: promptText }],
        config
      });

      console.log(`[Server] Successfully generated full page text of length ${fullText.length}. Parsing...`);
      const parsed = robustParseFullPageJson(fullText);
      res.json(parsed);

    } catch (err: any) {
      console.error("[Server API Error]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "An error occurred during full page generation" });
      } else {
        res.end();
      }
    }
  });

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start full-stack server:", err);
});
