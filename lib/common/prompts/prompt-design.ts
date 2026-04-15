export const MOTIONSITES_DESIGN_PROMPT = `
    Prompt Stellar AI:
    Create a "Stellar.ai" landing page hero section using React, Tailwind CSS, and Lucide React icons. Use the Inter font (imported from Google Fonts). The page has a white background (bg-white), max-width max-w-7xl, and is centered with mx-auto.

Font: Import Inter (weights 400, 500, 600, 700) from Google Fonts. Set font-family: 'Inter', sans-serif on the body.

Custom CSS animations (in index.css):

@keyframes fadeInUp -- from opacity: 0; transform: translateY(30px) to opacity: 1; transform: translateY(0). Class .animate-fade-in-up uses this with 0.6s ease-out forwards.
@keyframes fadeInOverlay -- from opacity: 0 to opacity: 1. Class .animate-fade-in-overlay uses this with 0.4s ease-out forwards.
@keyframes fadeInDialog -- from opacity: 0 to opacity: 1. Class .animate-slide-up-overlay uses this with 0.5s ease-out forwards and has transform: translate(-50%, -50%).
Every major section uses .animate-fade-in-up with staggered animationDelay inline styles (starting at 0.1s and incrementing by 0.1s). Each element starts with opacity: 0 inline so the animation fills it to visible.

Tailwind config: Default config with no custom theme extensions. Uses standard content paths.

NAVIGATION (animationDelay: 0.1s):
px-6 py-4 flex items-center justify-between max-w-7xl mx-auto
Left: Lucide Star icon (w-5 h-5, fill-black) + "Stellar.ai" text (text-lg font-semibold)
Center (hidden on mobile, hidden md:flex items-center gap-8): "Solutions" with ChevronDown, "For Teams" with ChevronDown, "About Us", "Learn Hub" -- all text-sm text-gray-700 hover:text-black
Right: "Login" link (text-sm text-gray-700) + "Get started free" button (bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors)

HERO SECTION (px-6 pt-24 pb-32 max-w-7xl mx-auto text-center):
Reviews Badge (delay: 0.2s): inline-flex items-center gap-2 mb-8. Contains a bordered square (w-6 h-6 border border-gray-300 rounded) with a filled Star icon inside, plus "4.9 rating from 18.3K+ users" (text-sm font-medium text-black).

Main Heading (delay: 0.3s): text-6xl md:text-7xl lg:text-[80px] font-normal leading-[1.1] tracking-tight mb-5. First line: "Work Smarter. Move Faster." Second line: "AI Powers You Up." with gradient text (bg-gradient-to-r from-black via-gray-500 to-gray-400 bg-clip-text text-transparent).

Subheading (delay: 0.4s): text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto. Text: "Intelligent automation syncs with the tools you love to streamline tasks, boost output, and save time."

CTA Button (delay: 0.5s): bg-black text-white px-8 py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors mb-12. Text: "Begin Free Trial".

Tab Bar (delay: 0.6s): Centered bg-gray-100 rounded-lg p-1 container.
Mobile (md:hidden): 2x2 grid with 4 buttons: Analyse (BarChart3), Train (BookOpen), Testing (Users), Deploy (Rocket). Active: bg-white text-black shadow-sm. Inactive: text-gray-600.
Desktop (hidden md:flex): Same 4 buttons in row with vertical dividers (w-px h-5 bg-gray-300).
Tabs auto-cycle every 4s using setInterval. State: useState('analyse').

Video + Overlay Section (delay: 0.7s):
Container: relative rounded-3xl overflow-hidden h-[400px] md:h-[500px]
Video: src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_165750_358b1e72-c921-48b7-aaac-f200994f32fb.mp4", autoPlay, loop, muted, playsInline, w-full h-full object-cover.

4 Conditional Overlays per tab with animate-fade-in-overlay outer and animate-slide-up-overlay inner card:
a. Analyse: "Set Up Your AI Workspace" wizard with purple progress bar at 25%, 4 steps
b. Train: "AI Model Training" with orange progress at 67%, 4 metrics
c. Testing: "Test Suite Results" with green success, 127/127 tests
d. Deploy: "Deploy to Production" with 4 checklist items, Deploy Now button

Company Logos (delay: 0.8s): mt-24 flex with INTERSCOPE, SPOTIFY, Nexera (dot grid), M3 (serif italic), LAURA COLE (LC circle), vertex (dots)

    Prompt SkyElite Private Jets:
    Create a premium private jet landing page hero section with the following specifications:

Video Background:
Use this exact CloudFront video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_091828_e240eb17-6edc-4129-ad9d-98678e3fd238.mp4
Video should autoplay, be muted, loop continuously, and include playsInline attribute
Video covers entire viewport (100vh) using object-cover

Navigation Bar:
Brand name "SkyElite" on the left (text-2xl, font-semibold, text-gray-900)
Desktop menu items (hidden on mobile, visible md:flex): Start, Story, Rates, Benefits, FAQ
Navigation links in gray-900 with hover:text-gray-700 transition
Mobile hamburger menu button using Lucide React icons (Menu/X)
Mobile menu appears as dropdown with white/95 opacity background, backdrop blur, rounded corners, shadow
Max width 7xl, centered with px-8 py-6

Hero Content (centered, -mt-80 to pull up):
Small uppercase label: "PRIVATE JETS" (text-sm, font-semibold, gray-600, tracking-wider, mb-4)
Large two-line heading with overlapping effect:
Line 1: "Premium." (text-6xl md:text-7xl lg:text-8xl, font-normal, text-gray-500, leading-none, tracking-tighter)
Line 2: "Accessible." (same size, color: #202A36, negative margin-top: -12px for overlap)
Subtitle: "Your dedication deserves recognition." (text-lg md:text-xl, gray-600, mb-6, max-w-2xl)
Two call-to-action buttons (gap-4, centered):
"Discover" button: px-4 py-2, rounded-full, bg-gray-300, text-gray-800, font-medium, hover:bg-gray-400
"Book Now" button: px-4 py-2, rounded-full, white text, bg-color #202A36, hover color #1a2229 with smooth transitions

Typography:
Use Inter font (import from Google Fonts: 400, 500, 600, 700 weights)
Apply to entire body via CSS

Technical Setup:
React with TypeScript
Tailwind CSS for styling
Lucide React for icons
useState hook for mobile menu toggle
Full screen height container (h-screen)
Responsive breakpoints: mobile-first, md, lg
All transitions use transition-colors class

Layout Structure:
Outer container: min-h-screen, bg-gray-50
Hero section: relative, h-screen, overflow-hidden
Content wrapper: relative, h-full, flex flex-col
Main content area: flex-1, flex items-center justify-center

Make it clean, modern, and premium-looking with smooth interactions.
Prompt Liquid Glass Agency:
    Build a dark, premium, single-page landing page for an AI-powered web design agency using React + Vite + Tailwind CSS + shadcn/ui + Framer Motion (motion/react). The page has a luxury editorial aesthetic -- black backgrounds, white text, liquid glass (glassmorphism) effects, and cinematic video backgrounds.

FONTS
Import from Google Fonts:

https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap
* Headings: Instrument Serif (italic) -- used via Tailwind class font-heading
* Body: Barlow (weights 300, 400, 500, 600) -- used via Tailwind class font-body
Tailwind config extends fontFamily:

heading: ["'Instrument Serif'", "serif"]
body: ["'Barlow'", "sans-serif"]

COLOR THEME (CSS custom properties, HSL format)

:root {
  --background: 213 45% 67%;
  --foreground: 0 0% 100%;
  --card: 213 45% 62%;
  --card-foreground: 0 0% 100%;
  --primary: 0 0% 100%;
  --primary-foreground: 213 45% 67%;
  --secondary: 213 45% 72%;
  --secondary-foreground: 0 0% 100%;
  --muted: 213 35% 60%;
  --muted-foreground: 0 0% 100% / 0.7;
  --accent: 213 45% 72%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --border: 0 0% 100% / 0.2;
  --input: 0 0% 100% / 0.2;
  --ring: 0 0% 100% / 0.3;
  --radius: 9999px;
  --glass-bg: rgba(255, 255, 255, 0.12);
  --glass-border: rgba(255, 255, 255, 0.25);
  --glass-shadow: 0 4px 30px rgba(0, 0, 0, 0.08);
  --glass-blur: 16px;
}

LIQUID GLASS CSS (the core visual effect)
Two utility classes defined in index.css under @layer components:
.liquid-glass (subtle):

.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.15) 20%,
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.15) 80%,
    rgba(255, 255, 255, 0.45) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
.liquid-glass-strong (more prominent, used on CTA buttons):

.liquid-glass-strong {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  border: none;
  box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
  position: relative;
  overflow: hidden;
}
.liquid-glass-strong::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.2) 80%,
    rgba(255, 255, 255, 0.5) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
The ::before pseudo-element creates a gradient border effect using the mask-composite trick (thin glowing border that fades in the middle).

ASSETS & MEDIA URLS
Hero background video (MP4, CloudFront):

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4
Poster image: /images/hero_bg.jpeg (local file in public/images/)
StartSection video (HLS via Mux):

https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8
Stats section video (HLS via Mux, displayed desaturated):

https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8
CTA/Footer section video (HLS via Mux):

https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8
Feature GIFs (imported from src/assets/):
* feature-1.gif -- used in FeaturesChess row 1 (right side)
* feature-2.gif -- used in FeaturesChess row 2 (left side)
Logo icon: src/assets/logo-icon.png (12x12 Tailwind = h-12 w-12)

SECTION-BY-SECTION BREAKDOWN
1. NAVBAR (fixed, floating)
* Fixed position: fixed top-4 left-0 right-0 z-50, horizontal padding px-8 lg:px-16, vertical py-3
* Left: Logo image (h-12 w-12)
* Center (desktop only, hidden md:flex): Navigation links inside a liquid-glass rounded-full px-1.5 py-1 pill container
    * Links: "Home", "Services", "Work", "Process", "Pricing"
    * Each link: px-3 py-2 text-sm font-medium text-foreground/90 font-body
    * Last item: white solid button "Get Started" with ArrowUpRight icon, bg-white text-black rounded-full px-3.5 py-1.5 text-sm
2. HERO SECTION
* Container: relative overflow-visible, fixed height 1000px
* Background video: <video> tag with autoPlay, loop, muted, playsInline. Positioned absolute left-0 w-full h-auto object-contain z-0 with top: 20%. Source is the CloudFront MP4 URL. Poster is /images/hero_bg.jpeg.
* Dark overlay: absolute inset-0 bg-black/5 z-0
* Bottom gradient fade: absolute bottom-0, height 300px, linear-gradient(to bottom, transparent, black)
* Content (z-10, centered, paddingTop: 150px):
    * Badge pill: liquid-glass rounded-full px-1 py-1 with inner white "New" badge (bg-white text-black rounded-full px-3 py-1 text-xs font-semibold) and text "Introducing AI-powered web design."
    * Heading (BlurText component): "The Website Your Brand Deserves" -- text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-foreground leading-[0.8] max-w-2xl tracking-[-4px], animated word-by-word from bottom with blur, delay 100ms
    * Subtext (motion.p): "Stunning design. Blazing performance. Built by AI, refined by experts. This is web design, wildly reimagined." -- blur-in animation, delay 0.8s, text-sm md:text-base text-white font-body font-light leading-tight
    * CTA buttons (motion.div, delay 1.1s):
        * "Get Started" -- liquid-glass-strong rounded-full px-5 py-2.5 with ArrowUpRight icon
        * "Watch the Film" -- text-only with Play icon (filled)
    * Partners bar at bottom (mt-auto pb-8 pt-16): "Trusted by the teams behind" liquid-glass pill, then 5 partner names rendered in text-2xl md:text-3xl font-heading italic text-white with gap-12 md:gap-16: Stripe, Vercel, Linear, Notion, Figma
3. BlurText COMPONENT (custom animated text)
* Splits text by words or letters
* Uses IntersectionObserver to trigger on scroll
* Each word/letter is a <motion.span> that animates from {filter: 'blur(10px)', opacity: 0, y: 50} (when direction=bottom) through {filter: 'blur(5px)', opacity: 0.5, y: -5} to {filter: 'blur(0px)', opacity: 1, y: 0}
* Staggered by index with configurable delay (default 200ms per element)
* Step duration 0.35s per keyframe step
4. START SECTION ("How It Works")
* Full-width section with HLS video background using hls.js library
* Video: autoPlay, loop, muted, playsInline, absolute inset-0 w-full h-full object-cover
* Top and bottom gradient fades (200px each, black to transparent)
* Content centered (z-10, minHeight 500px):
    * Badge: "How It Works" in liquid-glass rounded-full px-3.5 py-1
    * Heading: "You dream it. We ship it." -- text-4xl md:text-5xl lg:text-6xl font-heading italic tracking-tight leading-[0.9]
    * Subtext: "Share your vision. Our AI handles the rest--wireframes, design, code, launch. All in days, not quarters." -- text-white/60 font-body font-light text-sm md:text-base
    * CTA: "Get Started" liquid-glass-strong rounded-full px-6 py-3
5. FEATURES CHESS (alternating rows)
* Section header: "Capabilities" badge + "Pro features. Zero complexity." heading
* Row 1 (flex, content left / image right):
    * Title: "Designed to convert. Built to perform."
    * Body: "Every pixel is intentional. Our AI studies what works across thousands of top sites--then builds yours to outperform them all."
    * Button: "Learn more" liquid-glass-strong
    * Gif: https://motionsites.ai/assets/hero-finlytic-preview-CV9g0FHP.gif download and place inside liquid-glass rounded-2xl overflow-hidden
* Row 2 (flex-row-reverse, content right / image left):
    * Title: "It gets smarter. Automatically."
    * Body: "Your site evolves on its own. AI monitors every click, scroll, and conversion--then optimizes in real time. No manual updates. Ever."
    * Button: "See how it works" liquid-glass-strong
    * gif: https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif download and place inside liquid-glass rounded-2xl overflow-hidden
6. FEATURES GRID ("Why Us")
* Section header: "Why Us" badge + "The difference is everything." heading
* 4-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6), each card is liquid-glass rounded-2xl p-6:
    1. Icon: Zap -- "Days, Not Months" -- "Concept to launch at a pace that redefines fast. Because waiting isn't a strategy."
    2. Icon: Palette -- "Obsessively Crafted" -- "Every detail considered. Every element refined. Design so precise, it feels inevitable."
    3. Icon: BarChart3 -- "Built to Convert" -- "Layouts informed by data. Decisions backed by performance. Results you can measure."
    4. Icon: Shield -- "Secure by Default" -- "Enterprise-grade protection comes standard. SSL, DDoS mitigation, compliance. All included."
    * Each icon sits in a liquid-glass-strong rounded-full w-10 h-10 circle
7. STATS SECTION
* HLS video background (Mux URL), displayed with filter: saturate(0) (desaturated/B&W)
* Top and bottom gradient fades (200px each)
* Content: liquid-glass rounded-3xl p-12 md:p-16 card with 4-column grid:
    * "200+" / "Sites launched"
    * "98%" / "Client satisfaction"
    * "3.2x" / "More conversions"
    * "5 days" / "Average delivery"
    * Values: text-4xl md:text-5xl lg:text-6xl font-heading italic
    * Labels: text-white/60 font-body font-light text-sm
8. TESTIMONIALS
* Section header: "What They Say" badge + "Don't take our word for it." heading
* 3-column grid (md:grid-cols-3 gap-6), each card is liquid-glass rounded-2xl p-8:
    1. "A complete rebuild in five days. The result outperformed everything we'd spent months building before." -- Sarah Chen, CEO, Luminary
    2. "Conversions up 4x. That's not a typo. The design just works differently when it's built on real data." -- Marcus Webb, Head of Growth, Arcline
    3. "They didn't just design our site. They defined our brand. World-class doesn't begin to cover it." -- Elena Voss, Brand Director, Helix
    * Quote: text-white/80 font-body font-light text-sm italic
    * Name: text-white font-body font-medium text-sm
    * Role: text-white/50 font-body font-light text-xs
9. CTA + FOOTER
* HLS video background (Mux URL)
* Top and bottom gradient fades (200px each)
* Content (z-10, centered):
    * Heading: "Your next website starts here." -- text-5xl md:text-6xl lg:text-7xl font-heading italic leading-[0.85]
    * Subtext: "Book a free strategy call. See what AI-powered design can do. No commitment, no pressure. Just possibilities."
    * Two buttons:
        * "Book a Call" -- liquid-glass-strong rounded-full px-6 py-3
        * "View Pricing" -- bg-white text-black rounded-full px-6 py-3
    * Footer bar (mt-32 pt-8 border-t border-white/10):
        * Left: "(c) 2026 Studio. All rights reserved." text-white/40 text-xs
        * Right: "Privacy", "Terms", "Contact" links text-white/40 text-xs

KEY DEPENDENCIES

{
  "motion": "^12.35.0",
  "hls.js": "^1.6.15",
  "lucide-react": "^0.462.0",
  "react-router-dom": "^6.30.1"
}
Icons used from lucide-react: ArrowUpRight, Play, Zap, Palette, BarChart3, Shield

OVERALL PAGE STRUCTURE

<div bg-black>
  <div z-10>
    <Navbar />           -- fixed floating nav
    <Hero />             -- 1000px tall, CloudFront MP4 video bg
    <div bg-black>
      <StartSection />   -- HLS video bg, "How It Works"
      <FeaturesChess />  -- alternating text/gif rows
      <FeaturesGrid />   -- 4-card grid
      <Stats />          -- HLS video bg (desaturated), stats card
      <Testimonials />   -- 3-card grid
      <CtaFooter />      -- HLS video bg, CTA + footer
    </div>
  </div>
</div>

ANIMATION PATTERNS
1. BlurText (heading): Word-by-word stagger from bottom with gaussian blur dissolve, IntersectionObserver triggered
2. Hero subtext: motion.p with filter: blur(10px) -> blur(0px), opacity: 0 -> 1, y: 20 -> 0, delay 0.8s, duration 0.6s
3. Hero CTA buttons: Same blur-in pattern, delay 1.1s
4. All video backgrounds: autoPlay, loop, muted, playsInline with top/bottom black gradient fades (200px typically, 300px on hero bottom)

DESIGN PATTERNS USED THROUGHOUT
* Every section badge: liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body
* Every section heading: text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]
* Every body text: text-white/60 or text-white/70, font-body font-light text-sm md:text-base
* Primary CTA: liquid-glass-strong rounded-full with ArrowUpRight icon
* Secondary CTA: bg-white text-black rounded-full
* Card containers: liquid-glass rounded-2xl
* Video overlay fades: always linear-gradient(to bottom/top, black, transparent) with pointer-events-none
    Prompt Velorah:
    Create a single-page hero section with a fullscreen looping background video, glassmorphic navigation, and cinematic typography. Use React + Vite + Tailwind CSS + TypeScript with shadcn/ui.

Video Background:

Fullscreen <video> element with autoPlay, loop, muted, playsInline
Source URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4
Positioned absolute inset-0 w-full h-full object-cover z-0

Fonts:

Import from Google Fonts: Instrumental Serif (display) and Inter weights 400/500 (body)
CSS variables: --font-display: 'Instrument Serif', serif and --font-body: 'Inter', sans-serif
Body uses var(--font-body), headings use inline fontFamily: "'Instrument Serif', serif"

Color Theme (dark, HSL values for CSS variables):

--background: 201 100% 13% (deep navy blue)
--foreground: 0 0% 100% (white)
--muted-foreground: 240 4% 66% (muted gray)
--primary: 0 0% 100%, --primary-foreground: 0 0% 4%
--secondary: 0 0% 10%, --muted: 0 0% 10%, --accent: 0 0% 10%
--border: 0 0% 18%, --input: 0 0% 18%

Navigation Bar:

relative z-10, flex row, justify-between, px-8 py-6, max-w-7xl mx-auto
Logo: "Velorah®" (® as <sup className="text-xs">), text-3xl tracking-tight, Instrument Serif font, text-foreground
Nav links (hidden on mobile, md:flex): Home (active, text-foreground), Studio, About, Journal, Reach Us — all text-sm text-muted-foreground with hover:text-foreground transition-colors
CTA button: "Begin Journey", liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground, hover:scale-[1.03]

Hero Section:

relative z-10, flex column, centered, text-center, px-6 pt-32 pb-40 py-[90px]
H1: "Where dreams rise through the silence." — text-5xl sm:text-7xl md:text-8xl, leading-[0.95], tracking-[-2.46px], max-w-7xl, font-normal, Instrument Serif. The words "dreams" and "through the silence." wrapped in <em className="not-italic text-muted-foreground"> for color contrast
Subtext: text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed — "We're designing tools for deep thinkers, bold creators, and quiet rebels. Amid the chaos, we build digital spaces for sharp focus and inspired work."
CTA button: "Begin Journey", liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-12, hover:scale-[1.03] cursor-pointer

Liquid Glass Effect (CSS class .liquid-glass):

.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

Animations (CSS keyframes + classes):

@keyframes fade-rise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-rise { animation: fade-rise 0.8s ease-out both; }
.animate-fade-rise-delay { animation: fade-rise 0.8s ease-out 0.2s both; }
.animate-fade-rise-delay-2 { animation: fade-rise 0.8s ease-out 0.4s both; }

H1 gets animate-fade-rise
Subtext gets animate-fade-rise-delay
Hero CTA button gets animate-fade-rise-delay-2

Layout: No decorative blobs, radial gradients, or overlays. Minimalist, cinematic, vertically centered hero. The video provides all visual depth.
Prompt CodeNest Coding Platform:
Create a high-end, dark-themed hero section for a coding education platform called 'CodeNest' using React and Tailwind CSS. The design must be responsive and follow these precise specifications:

1. Background & Layout:

Background: Implement a full-screen background video using the HLS stream: https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8. Use hls.js and set enableWorker: false to ensure stability in sandboxed environments.

Overlays: Set the video to 60% opacity. Add a dark linear gradient from the left (#070b0a to transparent) and a bottom-up gradient for readability.

Grid System: Add three thin vertical grid lines (white/10 opacity) at the 25%, 50%, and 75% marks across the screen (visible on desktop).

Central Glow: Place a large horizontal SVG ellipse glow in the center-top area with a cyan/dark green hue, using a 25px Gaussian blur filter.

2. The Liquid Glass Card:

Component: Create a 200x200px floating card positioned above the main headline, shifted exactly 50px upwards using translate-y-[-50px].

CSS Styling (Liquid Glass):

background: rgba(255, 255, 255, 0.01) with background-blend-mode: luminosity.

backdrop-filter: blur(4px).

box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1).

Border Effect: A ::before pseudo-element with inset: 0, padding: 1.4px, and a 180-degree white linear gradient. Use -webkit-mask-composite: xor and mask-composite: exclude to create a sharp, high-end border frame.

Content: '[ 2025 ]' tag (14px), 'Taught by Industry Professionals' headline (18px, using Instrument Serif italic for 'Industry'), and a small description (11px).

3. Hero Content & Typography:

Eyebrow: 'Career-Ready Curriculum' in Plus Jakarta Sans, bold, 11px, color #5ed29c.

Main Headline: 'LAUNCH YOUR CODING CAREER.' in Inter Extra Bold, uppercase, tracking-tight. Scale from 40px (mobile) to 72px (desktop). The final period must be green (#5ed29c).

Description: 'Master in-demand coding skills...' in Inter, 14px, 70% white opacity, max-width 512px.

Primary CTA: 'Get Started' button with an ArrowRight icon. Rounded-full, background #5ed29c, text #070b0a, uppercase, bold.

4. Global Navigation:

Header: Sticky/Absolute header with a white minimalist logo.

Desktop Menu: Links for 'PROJECTS', 'BLOG', 'ABOUT', 'RESUME' in Inter, 16px. Hover state: #5ed29c.

Mobile Menu: A functional hamburger menu that toggles a full-screen dark overlay.

5. Required Imports:

Fonts: Inter, Plus Jakarta Sans, and Instrument Serif (italic).

Icons: lucide-react (ArrowRight, Menu, X).

Library: hls.js for video streaming.
Prompt VEX Ventures:
Create a modern hero section with the following specifications:

Video Background:

Full-screen background video that autoplays, loops, and is muted
Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4
Video should cover the entire viewport with object-fit: cover
Navbar:

Glassmorphic navbar with "liquid glass" effect (semi-transparent dark background with blur)
Logo text: "VEX" (left side, 2xl font, semibold, tight tracking)
Navigation links (centered): Story, Investing, Building, Advisory
CTA button (right side): "Start a Chat" - white background, black text, rounded-lg, medium font weight
Navbar has rounded-xl corners and sits within padding
Hero Content Layout:

Two-column grid on large screens, single column on mobile
Left column contains the main heading, subheading, and action buttons
Right column contains a tag element aligned to bottom-right
Main Heading:

Text: "Shaping tomorrow\nwith vision and action." (two lines)
Font size: responsive (4xl on mobile → 7xl on xl screens)
Letter spacing: -0.04em
Character-by-character animation that slides in from left (-18px translateX) with staggered timing
Animation starts after 200ms delay, each character has 30ms delay between them
500ms transition duration per character
Subheading:

Text: "We back visionaries and craft ventures that define what comes next."
Gray-300 color, responsive text size (base → lg)
Fade-in animation starting at 800ms with 1000ms duration
Action Buttons:

Two buttons in a flex container with gap
Button 1: "Start a Chat" - white background, black text, rounded-lg
Button 2: "Explore Now" - liquid glass effect with white/20 border, rounded-lg
Both buttons fade in at 1200ms with 1000ms duration
Tag Element (bottom-right):

Text: "Investing. Building. Advisory."
Liquid glass background with white/20 border
Rounded-xl corners
Font size: responsive (lg → 2xl), light font weight
Fade-in animation at 1400ms with 1000ms duration
Liquid Glass CSS:


.liquid-glass {
  background: rgba(0, 0, 0, 0.4);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.1) 80%, rgba(255,255,255,0.3) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
Typography:

Font family: 'Helvetica Neue', Helvetica, Arial, sans-serif
Font smoothing: antialiased
Color Scheme:

Background: Black
Text: White
Accents: Gray-300 for secondary text
Borders: White with 20% opacity
Framework: React with TypeScript, Tailwind CSS, Vite
Prompt Innovation:
RECREATION PROMPT

Build a single-page landing site using React + TypeScript + Vite + Tailwind CSS + framer-motion + lucide-react. The entire page has a bg-black background. The font loaded via Google Fonts is Instrument Serif (italic and regular). Import it in index.css:


@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
LIQUID GLASS CSS (in index.css, inside @layer components)
Create a reusable .liquid-glass class used on every glass element:


.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.15) 20%,
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.15) 80%,
    rgba(255, 255, 255, 0.45) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
SECTION 1 -- HERO (full-viewport, in Index.tsx)
Full-screen (min-h-screen) container with overflow-hidden relative flex flex-col.

Background video: absolute, covers the entire viewport (absolute inset-0 w-full h-full object-cover object-bottom). URL:


https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4
Attributes: muted, autoPlay, playsInline, preload="auto". Starts at opacity: 0.

Video fade logic (vanilla JS via refs, no CSS transitions):

On canplay: play the video, then animate opacity from 0 to 1 over 500ms using requestAnimationFrame.
On timeupdate: when remaining time <= 0.55s, animate opacity from current to 0 over 500ms.
On ended: set opacity to 0, wait 100ms, reset currentTime to 0, play again, fade back to 1 over 500ms.
This creates a seamless loop with smooth crossfade to black between plays.
Navbar (relative z-20, px-6 py-6):

A liquid-glass rounded-full pill, max-w-5xl mx-auto, px-6 py-3, flex between left/right.
Left: Globe icon (24px, white) + "Asme" text (white, font-semibold, text-lg). Hidden on mobile: nav links "Features", "Pricing", "About" (text-white/80 hover:text-white text-sm font-medium, gap-8 ml-8).
Right: "Sign Up" text button (white, text-sm, font-medium) + "Login" button (liquid-glass rounded-full px-6 py-2, white text-sm font-medium).
Hero content (relative z-10, flex-1 flex flex-col items-center justify-center, px-6 py-12 text-center, -translate-y-[20%]):

Heading: text-7xl md:text-8xl lg:text-9xl, white, tracking-tight whitespace-nowrap, font-family 'Instrument Serif', serif. Text: Know it then <em className="italic">all</em>.
Email input: max-w-xl w-full. A liquid-glass rounded-full pill with pl-6 pr-2 py-2 flex items-center gap-3. Inside: transparent <input> with placeholder "Enter your email" (text-white placeholder:text-white/40). A white circular submit button (bg-white rounded-full p-3 text-black) containing ArrowRight icon (20px).
Subtitle: text-white text-sm leading-relaxed px-4. Text: "Stay updated with the latest news and insights. Subscribe to our newsletter today and never miss out on exciting updates."
Manifesto button: liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors.
Social icons footer (relative z-10, flex justify-center gap-4 pb-12):

Three liquid-glass rounded-full p-4 buttons for Instagram, Twitter, Globe icons (20px). text-white/80 hover:text-white hover:bg-white/5 transition-all.
SECTION 2 -- ABOUT SECTION (separate component AboutSection.tsx)
Uses framer-motion useInView (ref, { once: true, margin: "-100px" }).
bg-black pt-32 md:pt-44 pb-10 md:pb-14 px-6 overflow-hidden.
Subtle radial gradient overlay: bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)].
Label: "About Us" -- text-white/40 text-sm tracking-widest uppercase. Animates: opacity: 0, y: 20 -> opacity: 1, y: 0, duration 0.6.
Heading: text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight. Animates: opacity: 0, y: 40 -> opacity: 1, y: 0, duration 0.8, delay 0.1. Text structure:
Pioneering then ideas (Instrument Serif italic, text-white/60) for
Line break (hidden on mobile)
minds that then create, build, and inspire. (all Instrument Serif italic, text-white/60)
SECTION 3 -- FEATURED VIDEO (separate component FeaturedVideoSection.tsx)
bg-black pt-6 md:pt-10 pb-20 md:pb-32 px-6 overflow-hidden. Max-w-6xl.
A rounded-3xl overflow-hidden aspect-video container that animates opacity: 0, y: 60 -> opacity: 1, y: 0, duration 0.9.
Video: w-full h-full object-cover, muted, autoPlay, loop, playsInline, preload="auto". URL:

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4
Gradient overlay on video: bg-gradient-to-t from-black/60 via-transparent to-transparent.
Bottom overlay content (absolute bottom-0 left-0 right-0 p-6 md:p-10):
Flex row on desktop, column on mobile.
Left: a liquid-glass rounded-2xl p-6 md:p-8 max-w-md card. Label "Our Approach" (text-white/50 text-xs tracking-widest uppercase mb-3). Body text (text-white text-sm md:text-base leading-relaxed): "We believe in the power of curiosity-driven exploration. Every project starts with a question, and every answer opens a new door to innovation."
Right: "Explore more" button (liquid-glass rounded-full px-8 py-3, white text-sm font-medium) with whileHover={{ scale: 1.05 }} and whileTap={{ scale: 0.95 }}.
SECTION 4 -- PHILOSOPHY / INNOVATION x VISION (separate component PhilosophySection.tsx)
bg-black py-28 md:py-40 px-6 overflow-hidden. Max-w-6xl.
Heading: text-5xl md:text-7xl lg:text-8xl text-white tracking-tight mb-16 md:mb-24. Animates opacity: 0, y: 40 -> opacity: 1, y: 0, duration 0.8. Text: Innovation then x in Instrument Serif italic text-white/40, then Vision.
Two-column grid (grid-cols-1 md:grid-cols-2 gap-8 md:gap-12):
Left: Video in rounded-3xl overflow-hidden aspect-[4/3]. Animates from opacity: 0, x: -40. URL:

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4
muted, autoPlay, loop, playsInline, preload="auto".
Right: Animates from opacity: 0, x: 40. Two text blocks separated by a w-full h-px bg-white/10 divider.
Block 1: Label "Choose your space" (text-white/40 text-xs tracking-widest uppercase mb-4). Body (text-white/70 text-base md:text-lg leading-relaxed): "Every meaningful breakthrough begins at the intersection of disciplined strategy and remarkable creative vision. We operate at that crossroads, turning bold thinking into tangible outcomes that move people and reshape industries."
Block 2: Label "Shape the future". Body: "We believe that the best work emerges when curiosity meets conviction. Our process is designed to uncover hidden opportunities and translate them into experiences that resonate long after the first impression."
SECTION 5 -- SERVICES / WHAT WE DO (separate component ServicesSection.tsx)
bg-black py-28 md:py-40 px-6 overflow-hidden. Max-w-6xl.
Subtle radial gradient: bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)].
Header row: flex between "What we do" (text-3xl md:text-5xl text-white tracking-tight) and "Our services" label (text-white/40 text-sm, hidden on mobile). Animates opacity: 0, y: 30 -> visible, duration 0.7.
Two-card grid (grid-cols-1 md:grid-cols-2 gap-6 md:gap-8):
Each card: liquid-glass rounded-3xl overflow-hidden with group class. Animates opacity: 0, y: 50 -> visible, duration 0.8, staggered by 0.15s.
Card video area: aspect-video, object-cover, transition-transform duration-700 group-hover:scale-105. Gradient overlay: bg-gradient-to-t from-black/40 to-transparent.
Card body (p-6 md:p-8): tag label (uppercase, tracking-widest, text-white/40 text-xs), ArrowUpRight icon in a liquid-glass rounded-full p-2 circle, title (text-white text-xl md:text-2xl mb-3 tracking-tight), description (text-white/50 text-sm leading-relaxed).
Card 1: Video URL:

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4
Tag: "Strategy". Title: "Research & Insight". Description: "We dig deep into data, culture, and human behavior to surface the insights that drive meaningful, lasting change."
Card 2: Video URL:

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4
Tag: "Craft". Title: "Design & Execution". Description: "From concept to launch, we obsess over every detail to deliver experiences that feel effortless and look extraordinary."
Prompt Orbis NFT:
Create an NFT landing page called "Orbis.Nft" with 4 sections, using a dark space theme. The page uses video backgrounds served from CloudFront, a liquid glass UI effect, and a specific color/font system. Recreate it exactly as described below.

FONTS (Google Fonts)

Anton - Used for all headings and navigation text (aliased as font-grotesk in Tailwind)

Condiment - A cursive script used for accent/overlay text (aliased as font-condiment in Tailwind)

System monospace font (font-mono) - Used for body/description paragraphs

Load via Google Fonts in index.html:

https://fonts.googleapis.com/css2?family=Anton&family=Condiment&display=swap


COLOR SYSTEM (Tailwind config)

Background: #010828 (deep dark navy blue)

cream: #EFF4FF (off-white, used for all text)

neon: #6FFF00 (bright green, used for accent cursive text and underline bars)

LIQUID GLASS CSS EFFECT

Applied via a .liquid-glass class. This is used on the navbar, social icon buttons, NFT cards, and card overlays:

.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}


TEXTURE OVERLAY

A full-screen fixed texture overlay sits on top of everything (z-50, pointer-events-none). It uses a /texture.png image with mix-blend-mode: lighten at opacity: 0.6, covering the entire viewport with background-size: cover.

SECTION 1: HERO (Full viewport)

Background: Full-bleed looping muted autoplaying video covering the entire section with object-cover

Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4

Container: max-w-[1831px] centered with responsive horizontal padding

Section has rounded-b-[32px] bottom corners, clipping the video

Header:

Left: "Orbis.Nft" logo text in Anton, 16px, uppercase

Center: Navigation bar with liquid-glass effect, rounded-[28px], px-[52px] py-[24px]. Contains 5 links: Homepage, Gallery, Buy NFT, FAQ, Contact. Each link is Anton 13px uppercase. Links have hover:text-neon transition. Nav is hidden on mobile (hidden lg:block).

Hero Content:

Large heading in Anton font, responsive sizing: 40px mobile / 60px sm / 75px md / 90px lg. Uppercase. leading-[1.05] mobile, leading-[1] tablet+. Max width 780px on desktop, offset with lg:ml-32.

Text reads:

Beyond earth
and ( its ) familiar boundaries


Overlaid cursive accent text "Nft collection" in Condiment font (24px-48px responsive), positioned absolute to the right side of the heading, slightly rotated (-rotate-1), in neon green (text-neon), with mix-blend-exclusion and opacity-90.

Social Icons (Desktop):

3 square buttons (56x56px) stacked vertically in top-right corner, each with liquid-glass and rounded-[1rem]. Icons: Mail, Twitter, Github from lucide-react (20x20px). hover:bg-white/10 transition.

Social Icons (Mobile):

Same 3 buttons but centered horizontally below the heading, shown only below lg breakpoint.

SECTION 2: ABOUT / INTRO (Full viewport)

Background: Full-bleed looping muted autoplaying video with object-cover

Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4

Container: Same max-w-[1831px] centered, with generous vertical padding (64px-96px responsive)

Top Row (flex row on desktop, column on mobile):

Left: Heading in Anton, responsive 32px-60px, uppercase:

Hello!
I'm orbis


With an overlaid "Orbis" in Condiment cursive, neon green, mix-blend-exclusion, 36px-68px responsive, positioned absolute at bottom-right of heading, slightly rotated.

Right: Short paragraph in monospace 14px-16px, uppercase, cream color, max-width 266px: "A digital object fixed beyond time and place. An exploration of distance, form, and silence in space"

Bottom Row (flex row, space-between):

Two columns (left and right), each containing 2 identical paragraphs. Same monospace text as above but at opacity-10 (nearly invisible, decorative). Right column hidden below lg. On mobile, text uses text-[#010828] (dark) so it's effectively invisible against the video.

SECTION 3: NFT COLLECTION GRID

Background: Solid #010828 (no video)

Container: Same max-w-[1831px] centered

Header Row:

Left: Heading in Anton, 32px-60px responsive, uppercase:

Collection of
  [indented] Space objects


Where "Space" is in Condiment cursive neon green, and "objects" is in Anton. The second line is indented with ml-12 / ml-24 / ml-32 responsive.

Right: A "SEE ALL CREATORS" button. "SEE" is large (32px-60px), "ALL" and "CREATORS" are stacked smaller (20px-36px) next to it. Below the text is a neon green bar (bg-neon, height 6px-10px responsive, full width of button).

NFT Card Grid:

3-column grid on desktop (lg:grid-cols-3), 2 on tablet, 1 on mobile. Gap 24px.

Each card: liquid-glass container with rounded-[32px], padding 18px, hover:bg-white/10 transition.

Inside each card: a square video container (pb-[100%] aspect ratio trick) with rounded-[24px] overflow hidden.

Video URLs:

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4 (Score: 8.7/10)

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_054411_511c1b7a-fb2f-42ef-bf6c-32c0b1a06e79.mp4 (Score: 9/10)

https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055427_ac7035b5-9f3b-4289-86fc-941b2432317d.mp4 (Score: 8.2/10)

Each card has an overlay bar at the bottom: a liquid-glass bar with rounded-[20px], px-5 py-4, showing "RARITY SCORE:" label (11px, cream/70% opacity) and score value (16px). On the right side of the bar is a circular purple gradient button (48x48px, bg-gradient-to-br from-[#b724ff] to-[#7c3aed]) with a right-arrow chevron SVG inside, with shadow-lg shadow-purple-500/50 and hover:scale-110 transition.

SECTION 4: CTA / FINAL SECTION

Background: Full-width video (NOT object-cover, instead w-full h-auto block so it displays at native aspect ratio)

Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055729_72d66327-b59e-4ae9-bb70-de6ccb5ecdb0.mp4

Text Content (positioned absolute over the video):

Right-aligned block, offset with lg:pr-[20%] lg:pl-[15%]

Small "Go beyond" text in Condiment cursive, neon green, mix-blend-exclusion, positioned absolute at top-left of the heading block. Sizes: 17px-68px responsive.

Heading in Anton, responsive 16px-60px, uppercase:

JOIN US.
REVEAL WHAT'S HIDDEN.
DEFINE WHAT'S NEXT.
FOLLOW THE SIGNAL.


"JOIN US." has extra bottom margin (mb-4 to mb-12 responsive) before the remaining lines.

Social Icons (Bottom-left, absolute positioned):

Positioned at left-[8%], bottom-[12%] to bottom-[20%] with responsive breakpoints.

A vertical liquid-glass container with rounded-[0.5rem] to rounded-[1.25rem] responsive, containing 3 stacked icon buttons (Mail, Twitter, Github).

Buttons have responsive widths using viewport units and rem values (e.g., w-[14vw] sm:w-[14.375rem] md:w-[10.78125rem] lg:w-[16.77rem]) and similar responsive heights.

Buttons are separated by border-b border-white/10 dividers (except the last one).

KEY TECHNICAL DETAILS

Framework: React + TypeScript + Vite + Tailwind CSS

Icons: lucide-react (Mail, Twitter, Github)

No additional packages needed beyond what Vite + React + Tailwind provides

All videos: autoPlay loop muted playsInline attributes

Responsive: Mobile-first with sm:, md:, lg: breakpoints throughout

Max content width: 1831px across all sections

All text is uppercase except the Condiment cursive accents which are normal-case
Prompt Transform Data chat ai page:
HERO SECTION CREATION PROMPT

Create a modern hero section with a looping video background and the following specifications:

Video Background:

URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4

Size: 115% width and height

Position: Centered horizontally, anchored to top with object-top focal point

Custom JavaScript fade system (NO CSS transitions):

250ms requestAnimationFrame-based fade-in on load/loop start

250ms fade-out when 0.55 seconds remain before video end

fadingOutRef boolean prevents re-triggering fade-out from repeated timeUpdate events

On ended: opacity set to 0, 100ms delay, reset to currentTime = 0, play, fade back in

Each new fade cancels running animation frames to prevent competing animations

Fades resume from current opacity (no snapping)

Fonts Required:

Schibsted Grotesk (weights: 400, 500, 600, 700)

Inter (weights: 400, 500, 600, 700)

Noto Sans (weights: 400, 500, 600, 700)

Fustat (weights: 400, 500, 600, 700)

Navigation Bar:

Logo: "Logoipsum" (Schibsted Grotesk SemiBold, 24px, -1.44px tracking)

Menu items (Schibsted Grotesk Medium, 16px, -0.2px tracking):

Platform

Features (with dropdown chevron icon)

Projects

Community

Contact

Right side buttons:

"Sign Up" (transparent background, 82px width)

"Log In" (black background, white text, 101px width)

Padding: 120px horizontal, 16px vertical

Hero Content (moved up 50px with -mt-[50px]):

Badge Component:

Dark badge with star icon + "New" text

Light background with text: "Discover what's possible"

Font: Inter Regular, 14px

Rounded corners with subtle shadow

Main Headline:

Text: "Transform Data Quickly"

Font: Fustat Bold, 80px, -4.8px tracking, line-height: none

Color: Black, center-aligned

Subtitle:

Text: "Upload your information and get powerful insights right away. Work smarter and achieve goals effortlessly."

Font: Fustat Medium, 20px, -0.4px tracking

Color: #505050

Max-width: 736px, width: 542px

Search Input Box:

Backdrop blur with dark transparent background (rgba(0,0,0,0.24))

Dimensions: 728px max-width, 200px height, rounded 18px

Top row: Credit info

Left: "60/450 credits" with green "Upgrade" button

Right: AI icon + "Powered by GPT-4o"

Font: Schibsted Grotesk Medium, 12px, white text

Main input area:

White background, rounded 12px, shadow

Placeholder: "Type question..." (16px, rgba(0,0,0,0.6))

Black circular submit button with up arrow icon (36px size)

Bottom row:

Left: Three action buttons (gray backgrounds, rounded 6px):

"Attach" with paperclip icon

"Voice" with microphone icon

"Prompts" with search icon

Right: Character counter "0/3,000" (12px, gray)

Icons (SVG paths from imported file):

Chevron down arrow

Up arrow

Star icon

AI sparkle icon

Attach/paperclip icon

Voice/microphone icon

Search icon

Spacing:

Gap between navigation and hero: 60px

Gap between header and search box: 44px

Gap within header elements: 34px (badge to title, title to subtitle)

Hero content moved up: 50px negative margin

Horizontal padding: 120px

Color Scheme:

Black text: #000000

Gray text: #505050

Light gray backgrounds: #f8f8f8

Green upgrade button: rgba(90,225,76,0.89)

Dark badge: #0e1311

White: #ffffff

Transparent overlay: rgba(0,0,0,0.24)

Component Structure:

VideoBackground component with custom fade logic

Navigation bar (fixed spacing, horizontal layout)

Hero content container (centered, max-width constraints)

Nested components for badge, header, and search input

All elements positioned over full-screen video background
Prompt AI Designer Portfolio:
Build a single-page creative studio portfolio landing page for "V Vortex" -- the studio of Sarah Vortex, a former Apple designer. Use React + TypeScript + Vite + Tailwind CSS. Use lucide-react for icons. No other UI libraries.

FONTS:

Body: "PP Neue Montreal" loaded via @font-face from these URLs:
Book (400): https://assets.website-files.com/6009ec8cda7f305645c9d91b/60176f9bb43e36419997ecfe_PPNeueMontreal-Book.otf
Medium (500): https://assets.website-files.com/6009ec8cda7f305645c9d91b/60176f9b39c5673e51a86f5a_PPNeueMontreal-Medium.otf
Display/Serif accent: "PP Mondwest" loaded from a local /PPMondwest-Regular.woff2 file. Applied inline via style={{ fontFamily: "'PP Mondwest', serif" }} on accent words like "next wave", "bold way", "builders", etc.
Set body font-family to: 'PP Neue Montreal', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

COLOR PALETTE:

Primary dark: #051A24
Dark: #0D212C
Muted dark: #273C46
Light text: #F6FCFF
Light muted: #E0EBF0
Background: white
No purple, indigo, or violet hues anywhere.

GLOBAL ANIMATIONS (in index.css):

marquee keyframe: translateX(0) to translateX(-50%), 30s linear infinite on desktop, 10s on mobile (max-width: 767px).
fadeInUp keyframe: from opacity: 0; translateY(30px) to opacity: 1; translateY(0), 0.8s ease-out forwards. Class: .animate-fade-in-up with initial opacity: 0.

CUSTOM HOOK: useInViewAnimation

IntersectionObserver-based hook. Returns { ref, isInView }. isInView flips to true once when the element enters viewport (threshold 0.1). Never resets. Used on every section for staggered animate-fade-in-up entrance animations with incremental animationDelay (0.1s, 0.2s, 0.3s, etc.).

REUSABLE BUTTON COMPONENT:

Three variants -- primary, secondary, tertiary. All use: px-7 py-3 rounded-full font-medium text-sm transition-colors whitespace-nowrap.

primary: bg-[#051A24] text-white hover:bg-[#0D212C] with multi-layer shadow
secondary: bg-white text-[#051A24] with shadow
tertiary: Same as secondary but adds inset shadow
Renders as <a> if href is provided, otherwise <button>.

PAGE SECTIONS (top to bottom):

1. HERO SECTION (max-width 440px, centered, px-6, pt-12 md:pt-16)
Logo: "V Vortex" in PP Mondwest, text-[32px] md:text-[40px] lg:text-[44px], font-semibold, color #051A24
Tagline: "The creative studio of Sarah Vortex" -- font-mono, text-xs md:text-sm, color #051A24
Heading: "Build the next wave, the bold way." with "next wave" and "bold way." in PP Mondwest serif.
Description: Three paragraphs about Apple background, studio philosophy, and "$25,000/month" pricing.
Two buttons: "Start a chat" (primary) and "View projects" (secondary).

2. INFINITE IMAGE MARQUEE (full width, mt-16 md:mt-20, mb-16)
Uses 8 GIF URLs from motionsites.ai, duplicated for seamless looping.
Each image: h-[280px] md:h-[500px] object-cover mx-3 rounded-2xl shadow-lg

3. TESTIMONIAL QUOTE SECTION (centered, max-w-2xl)
Large quote with "Apple" in PP Mondwest serif.
Author: "Sarah Vortex" in italic.
Three brand names and a parallax-scrolling image.

4. PRICING SECTION (max-w-7xl, cards right-aligned)
Two cards: Monthly Partnership (dark) and Custom Project (white), both $25,000.

5. TESTIMONIAL CAROUSEL (max-w-7xl, auto-scrolling every 3s)
5 testimonial cards with avatars from Pexels.
Navigation arrows below carousel.

6. PROJECTS SECTION (max-w-[1200px])
3 project cards with GIF previews from motionsites.ai.

7. PARTNER CTA SECTION with mouse trail effect spawning preview images.

8. FOOTER with links and copyright bar.

9. FIXED BOTTOM NAV floating pill with "V" logo and "Start a chat" button.
Prompt Grow AI Talent Platform:
Build a dark-themed landing page hero section with a navbar, headline, CTA button, background video with fade-in/out loop, and a logo marquee. Use React + Vite + Tailwind CSS + TypeScript with shadcn/ui. Install @fontsource/geist-sans.

1. Theme & Design Tokens (index.css)
Set up a single dark theme (no light mode toggle). All colors in HSL:
:root {
  --background: 260 87% 3%;
  --foreground: 40 6% 95%;
  --card: 240 6% 9%;
  --card-foreground: 40 6% 95%;
  --popover: 240 6% 9%;
  --popover-foreground: 40 6% 95%;
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 4% 16%;
  --secondary-foreground: 40 6% 95%;
  --muted: 240 4% 16%;
  --muted-foreground: 240 5% 65%;
  --accent: 262 83% 58%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 100%;
  --border: 240 4% 20%;
  --input: 240 4% 20%;
  --ring: 262 83% 58%;
  --radius: 0.75rem;
  --hero-heading: 40 10% 96%;
  --hero-sub: 40 6% 82%;
}

Body font: 'Geist Sans', 'Inter', system-ui, sans-serif
Import these font weights:
@import "@fontsource/geist-sans/400.css";
@import "@fontsource/geist-sans/500.css";
@import "@fontsource/geist-sans/600.css";
@import "@fontsource/geist-sans/700.css";

2. Liquid Glass Utility (index.css)
Add a .liquid-glass utility class in @layer utilities:
.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

3. Tailwind Config
Add these to tailwind.config.ts:
All the semantic color tokens mapped to hsl(var(--token))
A hero color group: hero.heading and hero.sub
A marquee keyframe: 0% { transform: translateX(0%) } → 100% { transform: translateX(-50%) }
Animation: marquee: "marquee 20s linear infinite"

4. Button Variants
In the shadcn button.tsx, add two custom variants:
hero: "bg-primary text-primary-foreground rounded-full px-6 py-3 text-base font-medium hover:bg-primary/90"
heroSecondary: "liquid-glass text-foreground rounded-full px-6 py-3 text-base font-normal hover:bg-white/5"

5. Navbar Component
Full-width, py-5 px-8, flex row, justify-between
Left: A logo image (32px height). Use a logo.png from src/assets/logo.png
Center: Nav items as plain buttons: "Features" (with ChevronDown icon), "Solutions", "Plans", "Learning" (with ChevronDown icon). Text is text-foreground/90 text-base, gap-1 between items
Right: "Sign Up" button using heroSecondary variant, size="sm", rounded-full px-4 py-2
Below the navbar, add a full-width 1px gradient divider: mt-[3px] w-full h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent

6. Hero Section
Section with bg-background relative overflow-hidden
Contains the Navbar at the top
Below navbar + divider, centered content with pt-20 px-4
Headline "Grow": text-[230px] font-normal leading-[1.02] tracking-[-0.024em], font-family 'General Sans', sans-serif, bg-clip-text text-transparent with background-image: linear-gradient(223deg, #E8E8E9 0%, #3A7BBF 104.15%)
Subtext: text-hero-sub text-center text-lg leading-8 max-w-md mt-4 opacity-80, two lines: "The most powerful AI ever deployed" / "in talent acquisition" (split with <br/>)
CTA Button: heroSecondary variant, text "Schedule a Consult", px-[29px] py-[24px], wrapped in a div with mt-8 mb-[66px]

7. Social Proof / Video Section
Immediately below the hero, a separate <section> with relative w-full overflow-hidden.
Background Video: <video> element: autoPlay muted playsInline, absolute inset-0 w-full h-full object-cover, initial style={{ opacity: 0 }}
Source URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4
Fade logic (JavaScript): Use requestAnimationFrame to continuously read currentTime and duration. Fade in over 0.5s at the start, fade out over 0.5s at the end. On ended, set opacity to 0, wait 100ms, reset currentTime = 0, and play() again. This creates a seamless manual loop with fade transitions.
Gradient overlays: absolute inset-0 bg-gradient-to-b from-background via-transparent to-background
Content (z-10): flex flex-col items-center pt-16 pb-24 px-4 gap-20
A h-40 spacer div for video visibility

Logo Marquee at max-w-5xl:
Left side: text "Relied on by brands / across the globe" in text-foreground/50 text-sm, with <br/>, whitespace-nowrap shrink-0
Right side: horizontally scrolling marquee using animate-marquee (the 20s infinite animation)
Logos are placeholder brands: Vortex, Nimbus, Prysma, Cirrus, Kynder, Halcyn — duplicated for seamless loop
Each logo: a small liquid-glass w-6 h-6 rounded-lg square with the first letter, plus the brand name in text-base font-semibold text-foreground
Gap between logos: gap-16

8. Page Composition
The Index page simply renders <HeroSection /> then <SocialProofSection /> sequentially with no wrapper styling.
Prompt Portfolio Cosmic:
Prompt to recreate this landing page:

Build a single-page dark portfolio landing page using React + Vite + Tailwind CSS + TypeScript + GSAP + Framer Motion + hls.js.

---

## Global Design System

### Fonts
Google Fonts import: Inter (300–700) and Instrument Serif (italic, 400).
- --font-body: 'Inter', sans-serif → Tailwind font-body
- --font-display: 'Instrument Serif', serif → Tailwind font-display

### CSS Custom Properties (HSL, no hsl() wrapper — Tailwind adds it)
--bg: 0 0% 4%;
--surface: 0 0% 8%;
--text: 0 0% 96%;
--muted: 0 0% 53%;
--stroke: 0 0% 12%;
--accent: 0 0% 96%;

### Tailwind Custom Colors
bg: "hsl(var(--bg))",
surface: "hsl(var(--surface))",
"text-primary": "hsl(var(--text))",
muted: "hsl(var(--muted))",
stroke: "hsl(var(--stroke))",

### Accent Gradient
linear-gradient(90deg, #89AACC 0%, #4E85BF 100%) — used on logo ring, hover borders, progress bars. CSS utility class .accent-gradient.

### Custom Animations (in index.css)
- @keyframes scroll-down — translateY(-100%) → translateY(200%), 1.5s ease-in-out infinite
- @keyframes role-fade-in — opacity 0 + translateY(8px) → opacity 1 + translateY(0), 0.4s ease-out
- @keyframes gradient-shift — background-position 0% 50% → 100% 50% → 0% 50%, 6s ease infinite (for animated gradient borders)

### Forced dark theme — no light mode toggle. body gets bg-bg text-text-primary.

---

## Page Structure (Index.tsx)

{isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

---

## Section 1: Loading Screen

Full-screen overlay (fixed inset-0 z-[9999] bg-bg). Uses requestAnimationFrame counter from 000→100 over 2700ms.

- Top-left: "Portfolio" label — text-xs text-muted uppercase tracking-[0.3em]. Animates y:-20→0, opacity 0→1.
- Center: Rotating words ["Design", "Create", "Inspire"] cycling every 900ms. AnimatePresence mode="wait" with y:20→0→-20 transitions. text-4xl md:text-6xl lg:text-7xl font-display italic text-text-primary/80.
- Bottom-right: Counter display — text-6xl md:text-8xl lg:text-9xl font-display text-text-primary tabular-nums. Shows String(count).padStart(3, "0").
- Bottom progress bar: h-[3px] bg-stroke/50, inner div with .accent-gradient, scaleX(count/100) transform, box-shadow: 0 0 8px rgba(137, 170, 204, 0.35).
- On complete (count reaches 100): 400ms delay then calls onComplete.

---

## Section 2: Hero

Full-viewport section with background HLS video and centered content.

### Background Video
- HLS source: https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8
- Uses hls.js — if Hls.isSupported(), create HLS instance; else if native HLS support, set video.src directly.
- Video: autoPlay muted loop playsInline, absolutely positioned and centered with min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2.
- Dark overlay: bg-black/20
- Bottom fade: h-48 bg-gradient-to-t from-bg to-transparent

### Navbar (fixed, floats at top center)
fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4.

Inner pill: inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2. Gets shadow-md shadow-black/10 when scrollY > 100.

Contents (left to right):
1. Logo: 9×9 circle with accent gradient border (reverses direction on hover). Inner bg-bg circle with "JA" in font-display italic text-[13px]. Scales 110% on hover.
2. Divider: w-px h-5 bg-stroke mx-1 (hidden on mobile)
3. Nav links: ["Home", "Work", "Resume"] — text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2. Active: text-text-primary bg-stroke/50. Inactive: text-muted hover:text-text-primary hover:bg-stroke/50.
4. Divider
5. "Say hi" button: Same size as nav links. On hover, shows accent gradient border behind (using absolute span with inset: -2px). Inner content wrapped in bg-surface rounded-full backdrop-blur-md. Includes "↗" arrow.

### Hero Content (centered, z-10)
- Eyebrow: text-xs text-muted uppercase tracking-[0.3em] mb-8 — "COLLECTION '26". Class blur-in.
- Name: text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6 — "Michael Smith". Class name-reveal.
- Role line: "A {role} lives in Chicago." — roles cycle every 2s through ["Creative", "Fullstack", "Founder", "Scholar"]. Role word uses font-display italic text-text-primary animate-role-fade-in inline-block with key={roleIndex} for re-triggering animation.
- Description: text-sm md:text-base text-muted max-w-md mb-12 — "Designing seamless digital interactions by focusing on the unique nuances which bring systems to life."
- CTA Buttons (inline-flex gap-4):
  - "See Works": Solid button. Default: bg-text-primary text-bg. Hover: bg-bg text-text-primary with accent gradient border ring.
  - "Reach out...": Outlined button. Default: border-2 border-stroke bg-bg text-text-primary. Hover: border-transparent with accent gradient border ring.
  - Both: rounded-full text-sm px-7 py-3.5 hover:scale-105.

### GSAP Entrance
Timeline with ease: "power3.out":
- .name-reveal: opacity 0→1, y 50→0, duration 1.2s, delay 0.1s
- .blur-in: opacity 0→1, filter blur(10px)→blur(0px), y 20→0, duration 1s, stagger 0.1, delay 0.3s

### Scroll Indicator
Bottom-center, text-xs text-muted uppercase tracking-[0.2em] "SCROLL" label above a w-px h-10 bg-stroke line with animated highlight using .animate-scroll-down.

---

## Section 3: Selected Works

bg-bg py-12 md:py-16. Inner: max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16.

### Header
Framer Motion whileInView — opacity 0→1, y 30→0, duration 1s, ease [0.25,0.1,0.25,1], viewport once margin "-100px".
- Eyebrow: w-8 h-px bg-stroke + "Selected Work" text-xs text-muted uppercase tracking-[0.3em]
- Heading: "Featured *projects*" — italic word in font-display italic
- Subtext: "A selection of projects I've worked on, from concept to launch."
- "View all work" button (desktop only, hidden md:inline-flex) — rounded-full with gradient hover border ring + right arrow

### Bento Grid
grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6. Column spans alternate: 7/5/5/7.

4 project cards with titles: Automotive Motion, Urban Architecture, Human Perspective, Brand Identity.

Each card: bg-surface border border-stroke rounded-3xl with aspect ratios. Contains:
- Background image with object-cover group-hover:scale-105
- Halftone overlay: radial-gradient(circle, #000 1px, transparent 1px) at 4×4px, opacity-20 mix-blend-multiply
- Hover: bg-bg/70 opacity-0→1 + backdrop-blur-lg
- Hover label: pill with animated gradient border, white bg, "View — *Title*" (title in font-display italic)

---

## Section 4: Journal

bg-bg py-16 md:py-24. Same header pattern (eyebrow + "Recent *thoughts*" + subtext + "View all" button).

4 journal entries displayed as horizontal pills (rounded-[40px] sm:rounded-full) with titles, images, read times, and dates.

Each entry: flex items-center gap-6 p-4 bg-surface/30 hover:bg-surface border border-stroke.

---

## Section 5: Explorations (Parallax Gallery)

min-h-[300vh] section for scroll-driven parallax.

### Layer 1: Pinned Center (z-10)
h-screen div pinned with GSAP ScrollTrigger.create({ pin: contentRef, pinSpacing: false }).
- Eyebrow: "Explorations"
- Heading: "Visual *playground*"
- Subtext + Dribbble button

### Layer 2: Parallax Columns (z-20, absolute)
grid grid-cols-2 gap-12 md:gap-40 inside max-w-[1400px].

6 items split into 2 columns with GSAP scroll-driven parallax movement.
Cards: aspect-square max-w-[320px], with rotation and lightbox on click.

---

## Section 6: Stats

bg-bg py-16 md:py-24. 3-column grid with stats: 20+ Years Experience, 95+ Projects Done, 200% Satisfied Clients.

---

## Section 7: Contact / Footer

bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden.

### Background Video
Same HLS source as hero, but flipped vertically (scale-y-[-1]). Heavier overlay: bg-black/60.

### GSAP Marquee
"BUILDING THE FUTURE • " repeated 10×. GSAP xPercent: -50, duration 40, ease "none", repeat -1.

### CTA
Email button: mailto:hello@michaelsmith.com with gradient hover border ring.

### Footer Bar
Social links [Twitter, LinkedIn, Dribbble, GitHub] + Green pulsing dot + "Available for projects"

---

## Dependencies
gsap, framer-motion, hls.js, react-router-dom, tailwindcss-animate

Add smooth scroll nav and page transitions.
Prompt DesignPro Academy:
Create a full-screen hero section for a product design education platform called "DesignPro" with the following exact specifications:

Background:

Full-screen looping video background using this exact CloudFront URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4

Video should autoplay, loop, be muted, and play inline

Background color: black (#000000)

Navigation Bar:

Logo: Circular design with a white border (2px), containing a smaller filled white circle inside, followed by "DesignPro" text

Navigation links in a rounded pill container with gray-700 border: Home, About Us, Courses, Instructors, Testimonials, Blog, Contact us (with arrow icon)

All nav links: white/80 opacity, hover to full white

Font size: text-sm

Mobile: Show hamburger menu icon on screens smaller than lg

Max width: 7xl container with proper padding

Content Layout:

Top Section (below nav):

Two-column layout on large screens, stacked on mobile

Left column: "We deliver transformative programs that empower emerging product designers with cutting-edge expertise and vision to thrive globally."

Right column (right-aligned on lg+): "8000+ Talented Designers Launched !"

Both paragraphs: white/80 opacity, text-sm on mobile, text-base on desktop

Hero Section (center):

Small uppercase text above heading: "Seats for Next Program Opening Soon" (white/80 opacity, text-xs on mobile, text-sm on desktop, tight tracking)

Main heading with these exact specifications:

Line 1: "Become" in white, font-medium

Line 2: "Product Leader." with animated shiny gradient effect

Font sizes: text-5xl (mobile) scaling up to text-9xl (xl screens)

Line height: 0.85

Letter spacing: tracking-tighter

ShinyText Component:

Use framer-motion for animation

Base color: #64CEFB (light blue)

Shine color: #ffffff (white)

Animation speed: 3 seconds

Gradient spread: 100 degrees

Gradient should sweep across text continuously from left to right

Use CSS gradient with backgroundClip: text and transparent text fill

CTA Button:

Text: "Apply for Next Enrollment" with arrow icon (from lucide-react)

Black background, hover: gray-900

Rounded-full shape

Padding: px-6 md:px-8, py-3 md:py-4

Arrow should translate right on hover

Group hover animation on arrow icon

Typography:

Font family: Inter (sans-serif)

All text colors: white/80 opacity for body text, full white for headings and hover states

Technical Stack:

React + TypeScript

Vite

Tailwind CSS

Framer Motion for animations

Lucide React for icons

Responsive Breakpoints:

Mobile-first design

sm: 640px

md: 768px

lg: 1024px

xl: 1280px

Key CSS Details:

Container max-width: max-w-7xl with centered margins

Section height: h-screen

Video: absolute positioning, inset-0, object-cover

Content: relative z-10 positioning to appear above video

Smooth transitions on all interactive elements

Create the complete implementation including the ShinyText component with proper framer-motion animation logic.
Prompt Power AI:
Create a full-screen dark hero section with a looping background video, navbar, headline, subtitle, CTA button, and a logo marquee at the bottom. Here are the exact specifications:

Theme & Colors (index.css CSS variables):
Background: 260 87% 3% (deep dark blue-purple)
Foreground: 40 6% 95% (off-white)
Hero sub text: 40 6% 82%
Body font: Geist Sans (via @fontsource/geist-sans)
Headline font: General Sans (loaded from Fontshare: https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap)

Background Video (Index page wrapper):
Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4
Positioned absolute inset-0 w-full h-full object-cover behind all content
Starts with opacity: 0
Custom JS-controlled fade loop: 0.5s fade-in at start, 0.5s fade-out at end, using requestAnimationFrame. On ended, opacity resets to 0, waits 100ms, then replays from 0
No gradient overlays on the video
The wrapper div has overflow-hidden, the hero content sits in a relative z-10 div above

Blurred overlay shape (centered behind content):
w-[984px] h-[527px] opacity-90 bg-gray-950 blur-[82px]
Absolutely positioned at top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
pointer-events-none
The hero section has overflow-visible so the blur is not clipped

Navbar:
Full width, py-5 px-8, flex row with justify-between
Left: logo image (src/assets/logo.png, height 32px)
Center: nav items — "Features" (with ChevronDown), "Solutions", "Plans", "Learning" (with ChevronDown). Each is a button with text-foreground/90 and hover transition
Right: "Sign Up" button using heroSecondary variant, rounded-full px-4 py-2
Below navbar: a 1px divider line with gradient from-transparent via-foreground/20 to-transparent, offset mt-[3px]

Hero content (vertically centered in remaining space via flex-1):
Headline: "Power AI" at text-[220px], font-normal, leading-[1.02], tracking-[-0.024em], font-family General Sans
"Power " is plain text-foreground
"AI" uses bg-clip-text text-transparent with backgroundImage: linear-gradient(to left, #6366f1, #a855f7, #fcd34d) (indigo → purple → amber)
Subtitle: "The most powerful AI ever deployed / in talent acquisition" — text-hero-sub, text-lg, leading-8, max-w-md, mt-[9px], opacity-80
CTA: "Schedule a Consult" button, heroSecondary variant, px-[29px] py-[24px], mt-[25px]

Logo marquee (pinned to bottom of hero, pb-10):
Container: max-w-5xl mx-auto
Left side: static text "Relied on by brands / across the globe" in text-foreground/50 text-sm
Right side: infinite scrolling marquee with logos: Vortex, Nimbus, Prysma, Cirrus, Kynder, Halcyn (duplicated for seamless loop)
Each logo: a liquid-glass 24x24 rounded-lg icon showing the first letter, plus the name in text-base font-semibold text-foreground
Marquee animation: translateX(0%) → translateX(-50%), 20s linear infinite
gap-16 between logos, gap-12 between text and marquee

Liquid glass utility class (in index.css):
.liquid-glass { background: rgba(255, 255, 255, 0.01); background-blend-mode: luminosity; backdrop-filter: blur(4px); border: none; box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1); position: relative; overflow: hidden; }
.liquid-glass::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1.4px; background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }

Section structure: min-h-screen flex flex-col — navbar at top, content centered via flex-1 flex items-center justify-center, marquee at bottom.
Prompt Aethera Studio:
Prompt: Cinematic Hero Section with Looping Video Background

Create a fullscreen single-page hero section using React + Vite + Tailwind CSS + TypeScript with the following specifications:

Fonts:
Display text (headings, logo): Instrument Serif
Body text (navigation, descriptions): Inter
Import both fonts in /src/styles/fonts.css

Video Background:
URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4
Position: top: '300px' with inset: 'auto 0 0 0'
Implement custom fade-in/fade-out loop logic using React useEffect and useRef:
Use requestAnimationFrame to continuously monitor currentTime and duration
Fade in over 0.5s at the start (opacity 0 to 1)
Fade out over 0.5s before the end (opacity 1 to 0)
On ended event: set opacity to 0, wait 100ms, reset currentTime = 0, then play() again
This creates a seamless manual loop with smooth fade transitions
Add gradient overlays: absolute inset-0 bg-gradient-to-b from-background via-transparent to-background positioned over the video

Navigation Bar:
Logo: "Aethera®" (with registered trademark symbol as superscript)
Logo styling: text-3xl, tracking-tight, Instrument Serif, color #000000
Menu items: Home (color #000000), Studio, About, Journal, Reach Us (all others #6F6F6F)
Menu items: text-sm with transition-colors
CTA button: "Begin Journey", rounded-full, px-6 py-2.5, text-sm, black background (#000000), white text, hover scale 1.03
Layout: flex justify-between, px-8 py-6, max-w-7xl mx-auto

Hero Section:
Positioning: paddingTop: 'calc(8rem - 75px)', pb-40
Layout: centered (flex flex-col items-center justify-center text-center), px-6
Headline:
Text: "Beyond silence, we build the eternal."
Styling: text-5xl sm:text-7xl md:text-8xl, max-w-7xl, font-normal
Font: Instrument Serif
Line height: 0.95
Letter spacing: -2.46px
Color: #000000 for main text, #6F6F6F for italic emphasized words ("silence," and "the eternal.")
Animation: animate-fade-rise

Description:
Text: "Building platforms for brilliant minds, fearless makers, and thoughtful souls. Through the noise, we craft digital havens for deep work and pure flows."
Styling: text-base sm:text-lg, max-w-2xl, mt-8, leading-relaxed
Color: #6F6F6F
Animation: animate-fade-rise-delay

Hero CTA Button:
Text: "Begin Journey"
Styling: rounded-full, px-14 py-5, text-base, mt-12
Colors: black background (#000000), white text (#FFFFFF)
Hover: scale 1.03
Animation: animate-fade-rise-delay-2

Colors:
Background: white (#FFFFFF)
Headlines/logos/buttons: black (#000000)
Descriptions/menu items: gray (#6F6F6F)
Button text: white (#FFFFFF)

Animations (in /src/styles/theme.css):
fade-rise: opacity 0 to 1, translateY 20px to 0, duration 0.8s, ease-out
fade-rise-delay: same as fade-rise but with 0.2s delay
fade-rise-delay-2: same as fade-rise but with 0.4s delay

Layout Structure:
Container: relative min-h-screen w-full overflow-hidden
Background video layer (z-0)
Gradient overlay on video
Navigation bar (z-10)
Hero section (z-10)
All elements should be responsive and maintain the glassmorphic aesthetic with the specified padding, positioning, and smooth animations.
Prompt Nexora Automation:
Create a SaaS landing page hero section with the following exact specifications:

Page Layout

The entire page is h-screen flex flex-col bg-background overflow-hidden — the Navbar + Hero fill exactly 100vh with no scroll.
The page uses two Google Fonts imported via CSS: Instrument Serif (display/headings, including italic) and Inter (body text).
Fonts & Design Tokens (index.css)

Import fonts:

@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');
CSS variables (:root):

--background: 0 0% 100% (white)
--foreground: 210 14% 17% (dark charcoal)
--primary: 210 14% 17% / --primary-foreground: 0 0% 100%
--secondary: 0 0% 96% / --secondary-foreground: 0 0% 9%
--muted: 0 0% 96% / --muted-foreground: 184 5% 55%
--accent: 239 84% 67% (indigo/blue) / --accent-foreground: 0 0% 100%
--border: 0 0% 90%
--ring: 239 84% 67%
--radius: 0.5rem
--font-display: 'Instrument Serif', serif
--font-body: 'Inter', sans-serif
--shadow-dashboard: 0 25px 80px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)
Tailwind config extends fontFamily with display and body mapped to the CSS vars. All colors use hsl(var(--token)) pattern.

Navbar

flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body
Left: Logo text ✦ Nexora — text-xl font-semibold tracking-tight text-foreground
Right (hidden on mobile): Nav links "Home", "Pricing", "About", "Contact" — text-sm text-muted-foreground hover:text-foreground with gap-8
CTA button: rounded-full px-5 text-sm font-medium using primary styling
Hero Section




Background Video: Fullscreen muted autoplay loop video, absolute inset-0 w-full h-full object-cover z-0
Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4
All content wrapped in relative z-10 flex flex-col items-center w-full
1. Badge (top)

Framer Motion: fade up from y:10, duration 0.5s
inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground font-body
Text: "Now with GPT-5 support ✨"
mb-6
2. Headline

Framer Motion: fade up from y:16, duration 0.6s, delay 0.1s
text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl
Content: The Future of Smarter Automation — the word "Smarter" renders in Instrument Serif italic
3. Subheadline

Framer Motion: fade up from y:16, duration 0.6s, delay 0.2s
mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body
Text: "Automate your busywork with intelligent agents that learn, adapt, and execute—so your team can focus on what matters most."
4. CTA Buttons

Framer Motion: fade up from y:16, duration 0.6s, delay 0.3s
mt-5 flex items-center gap-3
Primary button: rounded-full px-6 py-5 text-sm font-medium font-body — text "Book a demo"
Play button: ghost variant, h-11 w-11 rounded-full border-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80 with a Play icon (lucide) h-4 w-4 fill-foreground
5. Dashboard Preview (custom coded, NOT an image)

Framer Motion: fade up from y:30, duration 0.8s, delay 0.5s
Container: mt-8 w-full max-w-5xl
Frosted glass wrapper: rounded-2xl overflow-hidden p-3 md:p-4 with inline styles:
background: rgba(255, 255, 255, 0.4)
border: 1px solid rgba(255, 255, 255, 0.5)
boxShadow: var(--shadow-dashboard)
Dashboard internals (all coded in React, text-[11px], select-none pointer-events-none):

Top bar: Logo "N" in rounded box + "Nexora" + chevron | Search bar with ⌘K shortcut | "Move Money" + bell + avatar "JB"
Sidebar (w-40): Items — Home (active), Tasks (badge "10"), Transactions, Payments (chevron), Cards, Capital, Accounts (chevron). Section "Workflows": Trake rutes, Payments, Notifications, Settings
Main content (bg-secondary/30):
Greeting: "Welcome, Jane" — text-sm font-semibold
Action buttons row: Send (primary/accent), Request, Transfer, Deposit, Pay Bill, Create Invoice — rounded-full pill buttons text-[10px], + "Customize" text
Two equal-width cards (flex-1 basis-0) side by side:
Balance card: "Mercury Balance" with checkmark, amount $8,450,190.32 (cents in text-xs text-muted-foreground), stats (Last 30 Days, +$1.8M green, -$900K red), SVG area chart (h-20) with smooth cubic Bézier curve, linear gradient fill from accent at 15% opacity to transparent, stroke in accent color strokeWidth="1.5"
Accounts card: Header "Accounts" with + and ⋮ icons. Three rows (py-3, no dividers, text-xs, justify-between): Credit $98,125.50, Treasury $6,750,200.00, Operations $1,592,864.82
Transactions table: "Recent Transactions" heading, table with columns Date/Description/Amount/Status. 4 rows: AWS -$5,200 Pending (amber), Client Payment +$125,000 Completed (green), Payroll -$85,450 Completed, Office Supplies -$1,200 Completed
Dependencies

framer-motion for all animations
lucide-react for all icons
shadcn/ui Button component
Tailwind CSS with tailwindcss-animate plugin
Key Design Decisions

The dashboard overflows toward the bottom of the viewport and is clipped by overflow-hidden on the parent
No dark mode — light only
All colors use semantic Tailwind tokens, never raw color values in components
The SVG chart uses a hand-crafted cubic Bézier path, not a charting library
Prompt New Era Bold Hero:
Create a responsive, full-screen Hero section using React and Tailwind CSS with the following specifications:

1. Layout & Positioning:

Set the container to at least screen height (min-h-screen) with a dark blue fallback background (#21346e).
Align the main content to the top of the page (not centered), adding significant top padding (approx pt-32 on mobile, pt-48 on desktop).
Use a standard container with horizontal padding.

2. Background Video:

Implement a full-screen, absolute-positioned background video.
The video must be set to autoPlay, loop, muted, and playsInline.
Use object-cover to ensure it fills the screen without distortion.
Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260206_044704_dd33cb15-c23f-4cfc-aa09-a0465d4dcb54.mp4

3. Typography (Main Headline):

Font Family: Rubik (sans-serif).
Style: Bold, Uppercase, White text.
Layout: Display the text on three separate lines:
Line 1: "NEW ERA"
Line 2: "OF DESIGN"
Line 3: "STARTS NOW"
Sizing: Large and responsive (text-6xl mobile, text-8xl tablet, text-[100px] desktop).
Spacing: Very tight line height (0.98) and negative letter spacing (-2px to -4px).

4. Custom CTA Button:

Place a button below the headline with a fixed size of 184px wide by 65px high.
Interaction: Add a hover effect that slightly scales up (scale-105) and an active press effect (scale-95).
Background: Instead of a standard CSS background, use an SVG element that fills the button container (absolute inset-0). Use a custom path for the shape filled with white.
Text: Centered label "GET STARTED".
Text Style: Rubik, Bold, Uppercase, 20px size, dark text color (#161a20).
Prompt Mindloop Landing:
Build a dark monochrome landing page called Mindloop — a newsletter/content platform. Use React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion. Fonts: Inter (sans) and Instrument Serif (serif, used for italic accent words). The entire theme is pure black (#000) background with white foreground — no colors or gradients beyond monochrome. Install hls.js and framer-motion.

Design System (index.css)
All CSS variables in HSL (no hsl() wrapper in the variable, just the values):

--background: 0 0% 0%
--foreground: 0 0% 100%
--card: 0 0% 5%
--card-foreground: 0 0% 100%
--primary: 0 0% 100%
--primary-foreground: 0 0% 0%
--secondary: 0 0% 12%
--secondary-foreground: 0 0% 85%
--muted: 0 0% 15%
--muted-foreground: 0 0% 65%
--accent: 170 15% 45%
--accent-foreground: 0 0% 100%
--border: 0 0% 20%
--input: 0 0% 18%
--ring: 0 0% 40%
--hero-subtitle: 210 17% 95%
Liquid Glass Effect (global CSS class .liquid-glass)

.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
Animation Pattern
All sections use a reusable fadeUp helper with staggered delays:

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, delay, ease: "easeOut" },
});

Page Structure (top to bottom)
1. Navbar (fixed, transparent)
Left: Logo (concentric circles icon — outer w-7 h-7 with border-2 border-foreground/60, inner w-3 h-3 with border border-foreground/60) + "Mindloop" bold text.
Center-left: Nav links ["Home", "How It Works", "Philosophy", "Use Cases"] separated by • dots. Links are text-muted-foreground hover:text-foreground.
Right: 3 social icons (Instagram, Linkedin, Twitter from lucide-react) in liquid-glass circular buttons (w-10 h-10 rounded-full).
No background — fully transparent, fixed top-0 z-50, padding px-8 md:px-28 py-4.

2. Hero Section (full viewport height)
Background: autoplaying looping muted MP4 video covering the entire section.
Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4
Bottom gradient: h-64 bg-gradient-to-t from-background to-transparent for smooth fade to black.
Content (centered, z-10, pt-28 md:pt-32):
Avatar row: 3 overlapping circular avatars (-space-x-2, w-8 h-8 rounded-full border-2 border-background) + "7,000+ people already subscribed" in text-muted-foreground text-sm.
Heading: text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-2px] — "Get Inspired with Us" where "Inspired" is font-serif italic font-normal.
Subtitle: text-lg in hsl(var(--hero-subtitle)) color — "Join our feed for meaningful updates, news around technology and a shared journey toward depth and direction."
Email form: liquid-glass rounded-full p-2 max-w-lg container with email input and a white bg-foreground text-background rounded-full px-8 py-3 "SUBSCRIBE" button with whileHover scale 1.03 and whileTap scale 0.98.

3. "Search has changed" Section
Top padding pt-52 md:pt-64, bottom padding pb-6 md:pb-9.
Heading: text-5xl md:text-7xl lg:text-8xl — "Search has changed. Have you?" with "changed." in serif italic.
Subtitle: text-muted-foreground text-lg max-w-2xl mx-auto mb-24.
3 platform cards (grid md:grid-cols-3 gap-12 md:gap-8 mb-20): Each card has a 200x200 icon image centered, platform name (font-semibold text-base), and description (text-muted-foreground text-sm).
ChatGPT icon: local asset icon-chatgpt.png
Perplexity icon: local asset icon-perplexity.png
Google AI icon: local asset icon-google.png
Bottom tagline: "If you don't answer the questions, someone else will." in text-muted-foreground text-sm text-center.

4. Mission Section
Padding pt-0 pb-32 md:pb-44.
Video: Large 800x800 looping autoplaying muted video centered.
Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4
Scroll-driven word-by-word reveal using useScroll and useTransform from framer-motion:
Paragraph 1 (text-2xl md:text-4xl lg:text-5xl font-medium tracking-[-1px]): "We're building a space where curiosity meets clarity — where readers find depth, writers find reach, and every newsletter becomes a conversation worth having." Words "curiosity", "meets", "clarity" are highlighted in --foreground, rest in --hero-subtitle.
Paragraph 2 (text-xl md:text-2xl lg:text-3xl font-medium mt-10): "A platform where content, community, and insight flow together — with less noise, less friction, and more meaning for everyone involved."
Each word transitions opacity from 0.15 to 1 based on scroll progress.

5. Solution Section
Padding py-32 md:py-44, border-t border-border/30.
Label: "SOLUTION" in text-xs tracking-[3px] uppercase text-muted-foreground.
Heading: text-4xl md:text-6xl — "The platform for meaningful content" (serif italic on "meaningful").
Video: Rounded rounded-2xl, aspect-[3/1] object-cover.
Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4
4-column feature grid (md:grid-cols-4 gap-8): Curated Feed, Writer Tools, Community, Distribution — each with title (font-semibold text-base) and description (text-muted-foreground text-sm).

6. CTA Section
Padding py-32 md:py-44, border-t border-border/30, overflow-hidden.
Background video (HLS via hls.js): absolute inset-0 object-cover z-0.
HLS URL: https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8
Uses Hls.isSupported() check with fallback to native HLS for Safari.
Overlay: absolute inset-0 bg-background/45 z-[1].
Content (z-10, centered):
Concentric circles logo icon (w-10 h-10 outer, w-5 h-5 inner).
Heading: "Start Your Journey" (serif italic).
Subtitle in text-muted-foreground.
Two buttons: "Subscribe Now" (bg-foreground text-background rounded-lg px-8 py-3.5) and "Start Writing" (liquid-glass rounded-lg).

7. Footer
Simple py-12 px-8 md:px-28 footer.
Left: "© 2026 Mindloop. All rights reserved." in text-muted-foreground text-sm.
Right: Privacy, Terms, Contact links in text-muted-foreground text-sm hover:text-foreground.

Key Dependencies
framer-motion for all animations
hls.js for the CTA background video streaming
@fontsource/inter (400, 500, 600, 700)
@fontsource/instrument-serif (400, 400-italic)
lucide-react for icons
tailwindcss-animate plugin

Assets Needed
3 avatar images (avatar-1.png, avatar-2.png, avatar-3.png)
3 platform icons (icon-chatgpt.png, icon-perplexity.png, icon-google.png)
Prompt Datacore Booking:
Create a responsive, full-screen hero section for a web application using React and Tailwind CSS.

Design System & Assets:

Fonts: Load and use 'Manrope' (for UI/Nav), 'Cabin' (for buttons/tags), 'Instrument Serif' (for headlines), and 'Inter' (for body text).

Primary Color: Purple #7b39fc
Secondary/Dark Color: Dark Purple #2b2344
Background: Use a full-screen, absolute-positioned HTML5 video background. The video should autoplay, loop, mute, and play inline. Ensure it covers the viewport (min-h-screen, object-cover) without an overlay (keep it opaque).

Video URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4

1. Navbar Component (Top Overlay)

Layout: Full width, transparent background, z-20 relative positioning.
Padding: px-6 (mobile) to px-[120px] (desktop), py-[16px].

Logo (Left): Use this specific SVG path filled with white:
Path: M1.04356 6.35771L13.6437 0.666504... (Future logo shape).

Navigation Links (Center-Left, Desktop Only):
Items: "Home", "Services" (with a ChevronDown icon), "Reviews", "Contact us".
Style: Manrope font, Medium weight, 14px size, White.
Hover effect: opacity-80.

Action Buttons (Right, Desktop Only):
Sign In: White background, thin gray border (#d4d4d4), rounded 8px, Black text (#171717), Manrope Semibold 14px.
Get Started: Primary Purple background (#7b39fc), rounded 8px, White text (#fafafa), Manrope Semibold 14px, subtle shadow.

Mobile: Hide links/buttons and show a White Menu icon (hamburger) that toggles a full-screen black overlay menu.

2. Hero Content (Centered)

Container: Centered vertically and horizontally (flex-col items-center text-center), z-10 relative, top margin mt-32.

Tagline Pill:
Style: Glassmorphism effect (bg-[rgba(85,80,110,0.4)], backdrop-blur, border rgba(164,132,215,0.5)).
Shape: Rounded 10px, Height 38px.
Content: A small inner badge (#7b39fc bg, rounded 6px) saying "New" followed by text "Say Hello to Datacore v3.2".
Font: Cabin, Medium, 14px, White.

Headline:
Text: "Book your perfect stay instantly and hassle-free".
Typography: Instrument Serif font, White.
Size: 5xl (mobile) to 96px (desktop).
Styling: Line-height 1.1. The word "and" should be italicized with specific spacing.

Subtext:
Text: "Discover handpicked hotels, resorts, and stays across your favorite destinations. Enjoy exclusive deals, fast booking, and 24/7 support."
Typography: Inter font, Normal weight, 18px.
Color: White with 70% opacity (text-white/70).
Width: Max width 662px.

Call to Action Buttons (Row):
Button 1: "Book a Free Demo" — Primary Purple (#7b39fc), rounded 10px, Cabin Medium 16px, White.
Button 2: "Get Started Now" — Dark Purple (#2b2344), rounded 10px, Cabin Medium 16px, Off-white (#f6f7f9).
Hover effects: Slightly lighten backgrounds on hover.
Prompt Glassmorphism Agency Hero:
Build a production-ready, responsive landing page using React, Tailwind CSS v4, and Vite. The design should feature a high-end, dark-mode "glassmorphism" aesthetic with specific purple/pink gradients.

1. Tech Stack & Libraries:
Use hls.js for video streaming.
Use motion/react (formerly Framer Motion) for animations.
Use react-use-measure for sizing logic.
Use clsx and tailwind-merge for class management.
Use lucide-react for standard icons (if needed), but I will provide custom SVG paths for specific UI elements.

2. Global Styling:
Background: Dark/Black (#010101).
Primary Gradient: A diagonal gradient used for accents: from-[#FA93FA] via-[#C967E8] to-[#983AD6].
Typography: Modern sans-serif, center-aligned hero text.

3. Hero Section Components:
Announcement Pill:
A pill-shaped top badge.
Background: Semi-transparent dark (bg-[rgba(28,27,36,0.15)]) with a subtle border.
Icon: A "Zap" icon inside a gradient-filled box with a glow effect.
Text: "Used by founders. Loved by devs." in light grey.

Main Headline (H1):
Large text (responsive sizing: 48px mobile to 80px desktop).
Text: "Your Vision" on line 1, "Our Digital Reality." on line 2.
Style: Text should have a gradient fill (White to Purple/Pink).

Subheadline:
Text: "We turn bold ideas into modern designs that don't just look amazing, they grow your business fast."
Color: text-white/80.

CTA Button:
"Book a 15-min call" text.
Rounded full button with a white background and black text.
Includes a circle icon with an arrow inside, styled with the primary purple gradient.
Outer border wrapper with a glass effect.

4. Hero Video Integration (Critical Details):
Source: HLS Stream URL: https://customer-cbeadsgr09pnsezs.cloudflarestream.com/697945ca6b876878dba3b23fbd2f1561/manifest/video.m3u8
Fallback: If HLS fails, fallback to this MP4: /_videos/v1/f0c78f536d5f21a047fb7792723a36f9d647daa1
Implementation: Do NOT use react-player. Use a native <video> tag with a custom useEffect hook implementation of hls.js.
Styling:
Blend Mode: Use mix-blend-screen so the video black background blends into the page.
Positioning: The video should be at the bottom of the hero. Apply a negative top margin (-mt-[150px]) so it overlaps behind the text.
Z-Index: Ensure the text content is z-20 (above) and video is z-10 (below).
Layout: The video must be 100% width (w-full), auto height, and stretch edge-to-edge without being cropped (do not use object-contain or fixed heights).
Overlay: Add a gradient fade (from-[#010101] via-transparent to-[#010101]) over the video container.

5. Logo Cloud Section (Animated):
Place this section immediately below the video.
Background: Semi-transparent glass (bg-black/20 backdrop-blur-sm) with a top border (border-white/5).
Layout:
Desktop: "Powering the best teams" text on the left, separated by a vertical divider. Animated logo slider on the right.
Mobile: Stacked vertically.
Animation: Create an InfiniteSlider component using motion/react that scrolls logos horizontally forever.
Logos: Use these SVG URLs (OpenAI, Nvidia, GitHub, etc.) and apply brightness-0 invert to make them white.
https://html.tailus.io/blocks/customers/openai.svg
https://html.tailus.io/blocks/customers/nvidia.svg
(Include others similarly)

Please assemble these into a cohesive Hero.tsx, App.tsx, and components/ui/infinite-slider.tsx structure.
Prompt Web3 EOS Hero:
Build a full-screen hero section for a Web3 landing page. Use the font "General Sans" (from Fontshare) throughout. The entire section has a pure black (#000000) background with a fullscreen looping background video (muted, autoplay, playsInline) using this URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4. The video is covered by a 50% black overlay (bg-black/50) for readability. All content sits on top of the video.

Navbar:

Horizontally spread across the top with 120px horizontal padding and 20px vertical padding.

Left side: a placeholder logo wordmark (use "LOGOIPSUM" or similar) in white, 187px wide and 25px tall, followed by 4 nav links spaced 30px apart: "Get Started", "Developers", "Features", "Resources". Each nav link is white, 14px, font-medium, with a small white 14px chevron-down arrow icon to the right (14px gap between label and arrow). Nav links are hidden on mobile.

Right side: a "Join Waitlist" pill button. This button has a subtle layered construction — a fully rounded pill shape with a thin 0.6px solid white outer border, and inside that, a black-background pill with the text "Join Waitlist" in white, 14px, font-medium, centered with 29px horizontal and 11px vertical padding. There's also a subtle white glow/light streak effect along the top edge of the button (a blurred white-to-transparent gradient blob positioned at the top).

Hero Content (centered below the navbar):

Vertically centered in the remaining viewport space, pushed down with about 280px top padding on desktop (200px on mobile), 102px bottom padding.

All content is horizontally centered and stacked vertically with 40px gaps.

Badge/pill: A small rounded pill (20px border-radius) with 10% white background and a 1px white/20% border. Inside: a tiny 4px white dot, then text reading "Early access available from" in white at 60% opacity, followed by " May 1, 2026" in solid white. Font is 13px, font-medium.

Heading: Large text reading "Web3 at the Speed of Experience", max-width 613px, 56px on desktop / 36px on mobile, font-medium, line-height 1.28. The text has a gradient fill — a linear-gradient at ~144.5 degrees going from solid white (at ~28%) to fully transparent black (at ~115%), applied as a background-clip text effect so the text itself shows the gradient.

Subtitle: Below the heading with a 24px gap. Text reads: "Powering seamless experiences and real-time connections, EOS is the base for creators who move with purpose, leveraging resilience, speed, and scale to shape the future." — 15px, font-normal, white at 70% opacity, max-width 680px, centered.

CTA Button: A "Join Waitlist" pill button similar to the navbar button but with a white background and black text instead. Same layered construction: 0.6px white outer border, white glow streak on top, and inside the white pill the text is 14px font-medium black, with 29px horizontal and 11px vertical padding.

The entire layout is responsive — nav links collapse on screens below md breakpoint, heading scales down, and padding adjusts.
Prompt HR SaaS Hero:
Create a minimalist, high-end React hero section using Tailwind CSS v4 and the Motion library.

Layout & Spacing:

The section should have a min-h-screen height and be centered.

Apply a heavy top padding of exactly 290px to the main content container to create an editorial, spacious feel.

The content container should have a max-w-[1200px] and a vertical gap of 32px between elements.

Background:

Use this background video: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4.

Critical: The video must be vertically flipped using scaleY(-1) and set to object-cover.

Apply a white gradient overlay on top of the video: from-[26.416%] from-[rgba(255,255,255,0)] to-[66.943%] to-white to seamlessly blend the video into the background.

Typography (Geist & Instrument Serif):

Main Heading: Use the 'Geist' font, medium weight, tracking -0.04em.

Text Content: 'Simple [management] for your remote team'.

Sizes: The main heading should be 80px (desktop), while the word 'management' should be in 'Instrument Serif' italic at 100px.

Description: Geist font, 18px, 80% opacity, slate color (#373a46), max-width 554px.

Interactive Components:

Email Navbar: Create a rounded (40px) input container with bg-[#fcfcfc], a thin border, and a soft shadow (0px 10px 40px 5px rgba(194,194,194,0.25)).

CTA Button: A dark, multi-layered gradient button ('Create Free Account') with a complex inner shadow for a high-gloss tactile effect: shadow-[inset_-4px_-6px_25px_0px_rgba(201,201,201,0.08),inset_4px_4px_10px_0px_rgba(29,29,29,0.24)].

Social Proof: Below the input, add a '1,020+ Reviews' badge with a row of star/brand icons.

Animations:

Use Motion to staggered 'fade and slide up' the heading, description, and the email input block for a smooth entrance.

Key Technical Specs for Implementation:

Video Class: className="w-full h-full object-cover [transform:scaleY(-1)]"

Gradient Class: className="absolute inset-0 bg-gradient-to-b from-[26.416%] from-[rgba(255,255,255,0)] to-[66.943%] to-white"

Button Shadow: shadow-[inset_-4px_-6px_25px_0px_rgba(201,201,201,0.08),inset_4px_4px_10px_0px_rgba(29,29,29,0.24)]
Prompt Buzzentic Agency:
Project Requirements: Build a high-impact, full-screen React hero section using Tailwind CSS v4 and custom typography.

1. Background & Layout:

Full-Screen Video: Implement a background video that covers the entire viewport (object-cover).

Video Source: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_074215_04640ca7-042c-45d6-bb56-58b1e8a42489.mp4

Video Settings: Auto-play, loop, muted, and playsInline with no color overlays or filters.

Content Spacing: The main content block should have 250px of bottom padding to create breathing room above the fold.

2. Typography & Colors:

Primary Font: "Barlow" (sans-serif) for general UI and body text.

Accent Font: "Instrument Serif" (italic) for poetic emphasis.

Color Palette: Primary text is pure white (#FFFFFF) or white at 75% opacity. CTA buttons and badges use a neutral off-white (#f8f8f8).

3. Specific UI Elements:

Transparent Navigation: A floating navbar with no background fill and no border strokes. All navigation links and the brand logo must be white.

Featured Badge: A "Featured in Fortune" badge centered at the top. It features a "liquid glass" effect using a white/10 background with backdrop-blur-sm on the outer ring and white/90 with backdrop-blur-md on the inner pill.

Dynamic Headline:

Line 1: "Agency that makes your" (Barlow, font-light, text-white, 64px).

Line 2: "videos & reels viral" (Instrument Serif, italic, text-white, 64px).

Sub-headline: A max-width paragraph in Barlow font, white at 75% opacity, explaining the agency's value proposition.

Button Styling: Rectangular buttons with a very sharp 2px border radius, #f8f8f8 background, and #171717 medium Barlow text.

Corner Accents: Four 7px x 7px solid white squares positioned exactly at the four corners of the central hero content container.

4. Interactions & Animations:

All buttons and interactive badges should have smooth transition-colors on hover.

Buttons should shift from #f8f8f8 to pure white on hover.

Navigation items should have a subtle white/10 background highlight on hover.
Prompt Taskly:
System Prompt: High-Fidelity "Liquid Glass" Hero Section

Core Layout: Create a 1600px max-width landing page hero section. The background should be pure white with a subtle, layered gradient glow in the top-left (using blurred ellipses in light blue #60B1FF and #319AFF). The design must be fully responsive, transitioning from a single-column mobile view to a dual-column desktop layout.

Typography:

Headlines & Brand: Use Fustat (Bold).
Body & UI: Use Inter (Normal/Medium).
Hero Headline: "Work smarter, achieve faster" (75px, 1.05 line-height, -2px tracking).

The "Strong Liquid Glass" Navbar:

Position: Sticky at top-[30px], centered, w-fit.
Visuals: backdrop-blur-[50px], background rgba(255,255,255,0.3), rounded-[16px].
Fidelity Details:
Outer Stroke: 1px solid rgba(0,0,0,0.1).
Inner Highlight Shadow: inset 0px 4px 4px 0px rgba(255,255,255,0.25).
Items: Logo "Taskly" (Fustat), Nav links (Home, Features, Company, Pricing), and a glassy "SignUp" button with an arrow icon.

The Glassy Orb (Hero Right):

Source URL: https://future.co/images/homepage/glassy-orb/orb-purple.webm
Blending Mode: Must use mix-blend-screen to filter the black background.
Scaling: scale-125 to make it massive and bleed slightly off-center.
Exact Color Grade (CSS Filter): hue-rotate(-55deg) saturate(250%) brightness(1.2) contrast(1.1). This transforms the purple asset into a vibrant, high-end "Electric Brand Blue" that matches the primary CTA.

Hero Content (Hero Left):

Social Proof: A "Rated 4.9/5 by 2700+ customers" badge with five orange #FF801E stars.
Subheadline: "Effortlessly manage your projects, collaborate with your team, and achieve your goals with our intuitive task management tool." (18px, Inter, -1px tracking).
Primary CTA: "Get Started Now" button.
Color: rgba(0,132,255,0.8) with backdrop-blur-[2px].
Details: rounded-[16px], white text, inner highlight shadow inset 0px 4px 4px 0px rgba(255,255,255,0.35), and a white circular arrow icon.
Animation: Scale 1.02 on hover with a smooth transition.

Footer Logos: Include a "Trusted by Top-tier product companies" section at the bottom with 5 grayscale SVG logos (e.g., placeholder logos for tech companies) spaced at gap-[100px].

Key Technical Specs for the Developer:

Video Tag: autoPlay loop muted playsInline.
Container: Use a relative wrapper for the background glow and a z-10 main container for the content.
Smoothing: Apply -webkit-font-smoothing: antialiased for the sharpest typography.
Prompt Loader Animation:
Build a fullscreen loading screen component in React (Next.js 14, TypeScript). Uses Framer Motion for animations. Here is the exact specification:

Theme

css

--bg: #0a0a0a;
--text: #f5f5f5;
--muted: #888888;
--stroke: #1f1f1f;

Fonts: font-display → Instrument Serif (Google Fonts, italic, weight 400).

Component: LoadingScreen

Receives one prop: onComplete: () => void.

Container: <motion.div> — fixed inset-0 z-[9999] bg-bg. Exit animation: exit={{ opacity: 0 }}, duration 0.6s, ease [0.4, 0, 0.2, 1]. Wrap in <AnimatePresence mode="wait"> from the parent.

Element 1: "Portfolio" Label (Top-Left)

<motion.div> — absolute top-8 left-8 md:top-12 md:left-12.
Text: "Portfolio"
Class: text-xs md:text-sm text-muted uppercase tracking-[0.3em]
Entrance animation: initial={{ opacity: 0, y: -20 }}, animate={{ opacity: 1, y: 0 }}, duration 0.6s, delay 0.1s

Element 2: Rotating Words (Center)

absolute inset-0 flex items-center justify-center.
Three words cycle in sequence: "Design" → "Create" → "Inspire". A new word appears every 900ms. The word index increments via setInterval and stops at the last word (doesn't loop).

Each word is a <motion.span> inside <AnimatePresence mode="wait">, keyed by wordIndex:
Class: text-4xl md:text-6xl lg:text-7xl font-display italic text-text/80
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}

Element 3: Counter (Bottom-Right)

<motion.div> — absolute bottom-8 right-8 md:bottom-12 md:right-12.
A number that counts from 000 → 100 over exactly 2.7 seconds using requestAnimationFrame. Each frame calculates elapsed / 2700 * 100. The number is displayed zero-padded to 3 digits (e.g. 007, 042, 100):

{Math.round(progress).toString().padStart(3, '0')}

Class: text-6xl md:text-8xl lg:text-9xl font-display text-text tabular-nums
Entrance animation: initial={{ opacity: 0, y: 20 }}, animate={{ opacity: 1, y: 0 }}, duration 0.6s, delay 0.1s

When progress reaches 100: Wait 400ms, then call onComplete(). Use a ref for onComplete to avoid stale closures.

Element 4: Progress Bar (Bottom Edge)

absolute bottom-0 left-0 right-0. A 3px tall track:
Track: h-[3px] bg-stroke/50 (full width)
Fill: <motion.div> inside the track:
h-full origin-left
Background: linear-gradient(90deg, #89AACC 0%, #4E85BF 100%)
Glow: boxShadow: "0 0 8px rgba(137, 170, 204, 0.35)"
initial={{ scaleX: 0 }}
animate={{ scaleX: progress / 100 }}
transition={{ duration: 0.1, ease: "linear" }}

Parent Wrapper Behavior

The parent component (AppWrapper) controls visibility:
State: isLoading starts true
Renders <LoadingScreen onComplete={() => setIsLoading(false)} /> inside <AnimatePresence mode="wait"> only when isLoading is true
Main page content sits below with: style={{ opacity: isLoading ? 0 : 1, transition: "opacity 0.5s ease-out" }}
When the loader calls onComplete, it triggers: loader fades out (0.6s) → page fades in (0.5s)

Timing Summary

0.0s — Loader appears, "Portfolio" slides in, counter starts at 000
0.0s — "Design" appears
0.9s — "Create" replaces "Design"
1.8s — "Inspire" replaces "Create"
2.7s — Counter hits 100, progress bar full
3.1s — onComplete fires (400ms delay)
3.1s — Loader fades out (0.6s exit animation)
3.7s — Page content fades in (0.5s opacity transition)
Prompt Logoisum Video Agency Hero:
Build a premium, high-end hero section for a video editing agency named 'Logoisum' with the following specifications:

Background: Implement a full-screen, looping video background using this URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4. The video must be muted, autoplaying, and set to object-cover to fill the section without any color overlays.

Navigation Bar: A floating white navigation bar with rounded-[16px] and a subtle shadow.

Left: The agency logo.

Center: A menu with links for 'About', 'Works', 'Services', and 'Testimonial' using 14px Barlow Medium font.

Right: A dark (#222) primary CTA button labeled 'Book A Free Meeting' featuring a unique 45-degree arrow icon in a circular housing.

Typography & Hero Content:

Primary Headline: Centered layout. The first line 'Agency that makes your' should use a bold/medium Barlow font with tight tracking (tracking-[-4px]). The second line 'videos & reels viral' must use a large, elegant 'Instrument Serif' italic font (text-[84px]).

Subtext: Below the headline, add the text 'Short-form video editing for Influencers, Creators and Brands' in Barlow Medium, 18px, centered.

Secondary CTA: A large white pill-shaped button below the subtext labeled 'See Our Workreel' with a small play icon on the left.

Overall Aesthetic: The design should be minimal, ultra-modern, and responsive. Ensure all text and buttons are layered on top of the video background with clear visibility and proper spacing (min-h-[90vh]).
Prompt Bloom AI:
Create a full-screen hero landing page for "Bloom" — an AI-powered plant/floral design platform. The design uses a liquid glass morphism aesthetic over a looping video background.

Background
Full-screen autoplaying, looping, muted video background: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4
Video covers entire viewport with object-cover, sits at z-0. All content floats above at z-10.

Fonts
Display/Body: Poppins (Google Fonts) — used for headings and body text
Serif accent: Source Serif 4 (Google Fonts) — used only for italic/emphasis text inside headings (e.g., <em>, <i>, .italic inside h1-h3)
Headings use font-weight: 500

Color Palette
Strict grayscale only — all CSS variables are 0 0% X% HSL values
Text is text-white, text-white/80, text-white/60, text-white/50 for hierarchy
No colored accents whatsoever

Liquid Glass CSS (two tiers)
Define under @layer components:

.liquid-glass (light)
background: rgba(255,255,255,0.01);
background-blend-mode: luminosity;
backdrop-filter: blur(4px);
border: none;
box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
position: relative; overflow: hidden;
::before pseudo-element: gradient border using linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%, transparent 40%, transparent 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%) with padding: 1.4px, masked via -webkit-mask-composite: xor; mask-composite: exclude;

.liquid-glass-strong (heavy, for CTA/panels)
Same structure but backdrop-filter: blur(50px), box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15), and ::before uses 0.5/0.2 alpha instead of 0.45/0.15.

Layout — Two-Panel Split
Flex row, min-h-screen. Left panel w-[52%], right panel w-[48%] (hidden on mobile lg:flex).

Left Panel
Has a liquid-glass-strong overlay (absolute inset-4 lg:inset-6 rounded-3xl)
Nav: Logo image (/logo.png, 32×32) + "bloom" text (semibold, 2xl, tracking-tighter, white) on left. "Menu" button with Menu icon on right, liquid-glass pill.
Hero center (flex-1, centered):
Logo image again (80×80)
h1: "Innovating the / spirit of bloom AI" — text-6xl lg:text-7xl, tracking-[-0.05em], white. The italic part uses font-serif text-white/80
CTA button: "Explore Now" with Download icon in a w-7 h-7 rounded-full bg-white/15 circle. Button is liquid-glass-strong, rounded-full, hover:scale-105 active:scale-95
Three pills: "Artistic Gallery", "AI Generation", "3D Structures" — liquid-glass, rounded-full, text-xs text-white/80
Bottom quote:
"VISIONARY DESIGN" label (text-xs tracking-widest uppercase text-white/50)
Quote: "We imagined a realm with no ending." — mixed font-display/font-serif italic spans
Author: "MARCUS AURELIO" with horizontal lines on each side

Right Panel (desktop only)
Top bar: Social icons (Twitter, LinkedIn, Instagram) in a liquid-glass pill with ArrowRight. Account button with Sparkles icon button, both liquid-glass.
Community card: Small liquid-glass card (w-56), "Enter our ecosystem" title + description
Bottom feature section (mt-auto): Outer liquid-glass container with rounded-[2.5rem]
Two side-by-side cards: "Processing" (Wand2 icon) and "Growth Archive" (BookOpen icon), each liquid-glass rounded-3xl
Bottom card: flower image thumbnail (from @/assets/hero-flowers.png, 96×64), "Advanced Plant Sculpting" title + description, and a "+" button. All liquid-glass.

Icons
All from lucide-react: Sparkles, Download, Wand2, BookOpen, ArrowRight, Twitter, Linkedin, Instagram, Menu

Key Details
All interactive elements: hover:scale-105 transition-transform
Social icon links: text-white hover:text-white/80 transition-colors
Icon containers: w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
No border classes anywhere — glass effect handles all borders via ::before
border-radius token: --radius: 1rem
Prompt Targo Logistics Hero:
Design Prompt: Targo Hero Section

Brand Identity: Create a high-end, dark-themed hero section for a logistics brand called "targo". Use a color palette of deep black (#000000), a vibrant brand red (#EE3F2C), and crisp white for primary text. The typography should use the Rubik font family, with headlines in bold, uppercase, and slightly tight letter-spacing (approx. -4%).

Layout & Positioning:

Header: A clean top navigation bar with a white SVG logo (abstract symbol + "targo" wordmark) on the left. Include "Home", "About", and "Contact Us" links, plus a small red "Contact Us" button with clipped corners on the right.

Main Hero: The headline "Swift and Simple Transport" and a "Get Started" button should be left-aligned and positioned in the upper-third of the section (aligned toward the top rather than centered).

Bottom Widget: A "Book a Free Consultation" card positioned at the bottom-left.

Key Design Elements:

Video Background: An auto-looping, muted background video using URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260227_042027_c4b2f2ea-1c7c-4d6e-9e3d-81a78063703f.mp4. Ensure it has 100% opacity with no dark overlay.

Clipped-Corner Buttons: All primary buttons must feature a custom geometric shape using CSS clip-path (a 10-12px diagonal cut on the top-right and bottom-left corners). Use the brand red for "Get Started" and solid white for "Book a Call".

Liquid Glass Effect: The consultation card must use advanced glassmorphism: backdrop-filter: blur(40px) saturate(180%), a 1px white border with 12% opacity, a subtle diagonal white-to-transparent shine gradient across the surface, and an inner box-shadow for depth.

Scaled Proportions: The layout should feel refined and compact. Headlines should be roughly 64px on desktop, and the overall spacing should avoid excessive padding to maintain a "scaled-down" professional look.

Technical Details:

Frameworks: React & Tailwind CSS.

Icons: Use the Phone icon from lucide-react inside the consultation button.

Responsiveness: Ensure the headline scales down to ~42px on mobile and the padding adjusts from 64px (desktop) to 32px (mobile).
Prompt Neuralyn:
Create a dark landing page for "Neuralyn" — an analytics dashboard SaaS. Use React + Vite + Tailwind CSS + TypeScript + Framer Motion + shadcn/ui.

Fonts
Inter (400, 500, 600, 700) for body/UI via @fontsource/inter
Instrument Serif (400, 400-italic) for the italic accent word via @fontsource/instrument-serif

Color Theme (all HSL, dark mode by default in :root)
Background: 0 0% 0% (pure black)
Foreground: 0 0% 100% (pure white)
Muted foreground: 0 0% 65%
Card: 0 0% 5%
Border: 0 0% 20%
Hero subtitle: 210 17% 95%

Page Structure
Section 1: Hero (full viewport height, overflow-hidden)

Navbar — horizontal, padded px-8 md:px-28 py-4:

Left: Logo image + "Neuralyn" text (text-xl font-bold tracking-tight) + nav links (Home, Services with ChevronDown icon, Reviews, Contact us) — links hidden on mobile, gap-1 between links, gap-12 md:gap-20 between logo and links
Right: "Sign In" button — solid white background (bg-foreground), black text (text-background), rounded-lg text-sm font-semibold, hover opacity transition

Hero Content — centered column, mt-16 md:mt-20 px-4:

Tag pill: A "liquid glass" styled pill (liquid-glass class) with inner "New" badge (white bg, black text, rounded-md text-sm font-medium px-2 py-0.5) + "Say Hello to Corewave v3.2" in text-sm font-medium text-muted-foreground. Pill has px-3 py-2 rounded-lg mb-6.
Title: text-5xl md:text-7xl, tracking-[-2px], font-medium, leading-tight md:leading-[1.15] mb-3. Text: "Your Insights." / "One Clear Overview." — the word "Overview" is in Instrument Serif italic (font-serif italic font-normal)
Subtitle: text-lg font-normal leading-6 opacity-90 mb-8, color uses CSS variable --hero-subtitle. Text: "Neuralyn helps teams track metrics, goals, and progress with precision." with a <br/> after "goals,"
CTA Button: "Get Started for Free" — solid white (bg-foreground text-background), rounded-full px-8 py-3.5 text-base font-medium, whileHover: scale 1.03, whileTap: scale 0.98

Dashboard + Video Area — full viewport width using w-screen with marginLeft: calc(-50vw + 50%) trick, aspect-ratio: 16/9, positioned relative:

Background video: <video>, absolutely positioned inset-0 w-full h-full object-cover. URL: https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4
Dashboard image: Absolutely positioned, centered, max-w-5xl w-[90%] rounded-2xl, mixBlendMode: "luminosity". Has parallax scroll (y: 0→-250).
Bottom gradient fade: Absolutely positioned at bottom of section, h-40, gradient from background to transparent, z-30, pointer-events-none.

Parallax Scroll Effects (Framer Motion useScroll({ target: sectionRef, offset: ["start start", "end start"] }) + useTransform):

Hero text content group: y: [0, -200] and opacity: [1, 0] (fades over first 50% of scroll)
Dashboard image: y: [0, -250]

Entrance Animations: Staggered initial={{ opacity: 0, y }} / animate={{ opacity: 1, y: 0 }}:

Tag pill: y: 10, duration 0.5s, delay 0
Title: y: 20, duration 0.6s, delay 0.1
Subtitle: y: 20, duration 0.6s, delay 0.2
CTA: y: 20, duration 0.6s, delay 0.3
Dashboard area: y: 40, duration 0.8s, delay 0.4

Liquid Glass CSS

.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

Section 2: Testimonial (min-h-screen, centered, py-24 md:py-32 px-8 md:px-28)

Quote symbol image (w-14 h-10 object-contain)
Testimonial text (text-4xl md:text-5xl font-medium leading-[1.2], wrapped in flex flex-wrap): "Neuralyn revolutionized how we handle financial insights using smart analytics. We are now driving better outcomes quicker than we ever imagined! Neuralyn revolutionized how we handle financial insights using smart analytics."
Scroll-driven word reveal: Each word is a <motion.span> with mr-[0.3em]. Uses useScroll({ target: containerRef, offset: ["start end", "end center"] }). Each word maps to a sequential range [i/total, (i+1)/total] → opacity: [0.2, 1] and color: ["hsl(0 0% 35%)", "hsl(0 0% 100%)"].
Closing " quotation mark in text-muted-foreground ml-2
Author row (flex items-center gap-4): Avatar image (w-14 h-14 rounded-full border-[3px] border-foreground object-cover) + name "Brooklyn Simmons" (text-base font-semibold leading-7 text-foreground) + role "Product Manager" (text-sm font-normal leading-5 text-muted-foreground)
Layout: max-w-3xl mx-auto, content left-aligned (items-start), gap-10 between elements

Assets needed:
logo.png — small logo icon
hero-dashboard.png — dashboard screenshot
quote-symbol.png — decorative quote mark
testimonial-avatar.png — circular headshot
Prompt AI Automation Hero:
Create a full-screen hero section with the following exact specifications:

Layout & Structure:
- Full viewport height (h-screen), full width, relative positioning with overflow-hidden
- Background color: #070612 (dark purple-black)
- Content aligned to the left side, vertically centered
- Max-width container (max-w-7xl) with horizontal padding (px-6 lg:px-12)

Background Video:
Video Source: HLS stream from https://stream.mux.com/s8pMcOvMQXc4GD6AX4e1o01xFogFxipmuKltNfSYza0200.m3u8
- Autoplaying, looping, muted video positioned absolutely behind content
- Video shifted 200px to the right (margin-left: 200px)
- Video scaled to 1.2x with origin-left, object-cover, full height
- Bottom fade gradient (h-40) from background color to transparent (z-10)

Badge (top element):
- Pill-shaped badge with rounded-full, border border-white/20, backdrop-blur-sm
- Contains a Sparkles icon (lucide-react, w-3 h-3, text-white/80)
- Text: "New AI Automation Ally" in text-sm font-medium text-white/80
- Animated with blur-in effect (0.6s duration, no delay)

Main Heading:
- Three lines of text:
  - Line 1: "Unlock the Power of AI" (block display)
  - Line 2: "for Your" (inline)
  - Line 3: "Business." in serif italic font (inline)
- Font sizes: text-4xl md:text-5xl lg:text-6xl
- Font weight: font-medium
- Line height: leading-tight lg:leading-[1.2]
- Color: white (text-foreground)
- Each word animates in with staggered split-text animation (0.08s delay between words, 0.6s duration, y: 40px -> 0, opacity: 0 -> 1)

Subtitle:
- Text: "Our cutting-edge AI platform automates, analyzes, and accelerates your workflows so you can focus on what really matters."
- Styling: text-white/80, text-lg, font-normal, leading-relaxed, max-w-xl
- Animated with blur-in effect (0.4s delay, 0.6s duration)

CTA Buttons (bottom):
- Two buttons side by side with gap-4, flex-wrap
- Primary button "Book A Free Call":
  - Solid white background (bg-foreground), dark text (text-background)
  - Rounded-full, px-5 py-3
  - Includes right arrow icon (ArrowRight from lucide-react)
  - Links to /book-call
- Secondary button "Learn now":
  - Semi-transparent background (bg-white/20), backdrop-blur-sm
  - Rounded-full, px-8 py-3
  - White text
- Both buttons animated with blur-in effect (0.6s delay, 0.6s duration)

Animations (using framer-motion):
- BlurIn component: opacity 0->1, blur 10px->0, y 20->0
- SplitText component: splits text by words, staggers each word's animation

Z-index layering:
- Video: z-0
- Bottom gradient: z-10
- Content: z-20

Spacing:
- 12-unit gap (gap-12) between badge/heading group and CTA buttons
- 6-unit gap (gap-6) between badge and heading, and between heading and subtitle
Prompt Synapse Dark Hero:
Build a high-fidelity, dark-themed Hero Section using React, Tailwind CSS, and Framer Motion. The background should be solid black (#000000).

1. Structure & Layout:

Navbar: Fixed at the top with a blurred glass effect.

Logo: Text "Synapse" (font-medium, tracking-tight, white).

Links: Features (active state with gradient border), Insights, About, Case Studies (strikethrough style), Contact.

CTA: "Get Started for Free" (White/Gray gradient button).

Hero Content: Centered text container (z-10, relative).

Badges: Row of 3 glass-effect badges "Integrated with" + Icon.

Headline: "Where Innovation Meets Execution" (Large ~80px font, tight tracking, fade-in animation).

Subtext: 2-line description about testing and deployment.

Buttons:

"Get Started for Free" (Solid Black background, White border).

"Let's Get Connected" (Transparent glass style).

Logo Marquee: A static row of grayscale, 40% opacity logos (use placeholder SVGs) at the bottom.

2. Background Video (Crucial):

Source: https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8

Implementation: Create a memoized VideoPlayer component using hls.js to handle the .m3u8 stream. Ensure proper cleanup on unmount.

Styling: 100% Opacity (no dark overlays), playing in loop/muted/autoplay.

Positioning: The video container should have a height of 80vh and be positioned absolute bottom-[35vh], sitting effectively "floating" behind the text content but pushed up from the bottom edge.

3. Animations:

Use motion/react to apply staggered fade-in-up animations to the badges, headline, subtitle, and buttons on load.
Prompt ClearInvoice SaaS Hero:
Create a high-fidelity, dark-mode Hero section for a SaaS product called "ClearInvoice" using React and Tailwind CSS.

Tech Stack:
Framework: React (Vite)
Styling: Tailwind CSS
Animation: motion/react (Framer Motion)
Icons: lucide-react
Video: Native HTML5 <video> with hls.js for streaming (Do NOT use react-player).

1. Background Video (Crucial):
Source: https://stream.mux.com/hUT6X11m1Vkw1QMxPOLgI761x2cfpi9bHFbi5cNg4014.m3u8
Behavior: Autoplay, Loop, Muted, PlaysInline.
Opacity: 100% (No dark overlay).
Implementation: Create a memoized BackgroundVideo component using hls.js to handle the .m3u8 stream natively. Ensure it cleans up properly on unmount to prevent "AbortError".
Z-Index: It must sit behind all content (-z-10).

2. Layout & Styling:
Font Family:
Headings: "Switzer" (Medium weight, tight tracking).
Body: "Geist" (Clean, legible).

Top Bar: A 5px high gradient bar at the very top: from-[#ccf] via-[#e7d04c] to-[#31fb78].
Navbar:
Logo on left.
Links (Features, Pricing, Reviews) centered.
Auth buttons (Sign In, Sign Up) on right.
Mobile: Hamburger menu that opens a full-width dropdown.

3. Hero Content:
Headline: "Manage your online store while save 3x operating cost" (Large text: text-6xl, tight leading).
Subhead: "ClearInvoice takes the hassle out of billing with easy-to-use tools." (White/90).
Animations: Use motion/react to stagger the entrance of the Text, Buttons, and Social Proof (Fade Up + Slide).

4. Button Styles (Exact Recreation):
Primary Button:
Background: Gradient from-[#FF3300] to-[#EE7926].
Glow: An absolute positioned div behind the button with bg-orange-600 blur-lg opacity-20.
Inner Stroke: A 1.5px border overlay (border-white/20) inside the button for a "glassy" edge.
Hover: scale: 1.05, glow increases to opacity-60, and an Arrow icon slides in from the left.

Secondary Button:
Background: bg-white/90 backdrop blur.
Inner Stroke: 1.5px border (border-black/5).
Hover: scale: 1.05, background becomes solid white.

5. Social Proof:
Row of 3 user avatars (overlapping borders).
Text: "Trusted by 210k+ stores worldwide".
Prompt Price Calculator:
Recreate Project Estimation Calculator Section

Create a full-width dark calculator section with id calculator-section. Background: bg-background, padding py-16 md:py-28 px-4 md:px-16, max-width max-w-7xl centered.

Header: Centered. Small mono uppercase tracking-widest label "Try project estimation calculator" in text-muted-foreground. Below it, an h2: "Get premium website within your budget" — text-3xl md:text-4xl lg:text-5xl font-normal.

Layout: 2-column grid (grid-cols-1 lg:grid-cols-2), rounded-2xl overflow-hidden, no gap.

LEFT COLUMN (Calculator Form): Background #0D0D0D, padding p-8 lg:p-12, sections divided by divide-y divide-[#1E1E1E].

4 sections separated by horizontal dividers:

Service Type (radio buttons): h3 "What kind of service do you need?" — 3 options: "Only Design" (design), "Only Development" (development), "Design + Development" (both, default). Custom radio circles: w-5 h-5 rounded-full border-2, active = border-[#FF5656] with inner w-2 h-2 rounded-full bg-[#FF5656].

Number of Pages (slider): h3 with current value in #FF5656. Shadcn <Slider> min=1, max=30, step=1, default=5. Labels "1" and "30" below.

Add-ons (checkboxes): Two checkboxes with price labels on the right in #FF5656:

"I will need help with content" → +$50/pages

"I want to optimize my website for SEO" → +$50/pages Custom checkboxes: w-5 h-5 border-2 rounded, checked = border-[#FF5656] bg-[#FF5656] with white SVG checkmark.

Timeline (radio buttons): h3 "How fast do you need this?" — 3 options with prices:

"Within 7 Days" → +$100/pages

"Within 14 Days" → +$25/pages

"Regular Speed (Based on discussion)" → no extra cost (default)

RIGHT COLUMN (Cost Estimation): Padding p-8 lg:p-12, border border-white/10 rounded-r-2xl, min-height 717.98px.

h3 "Estimated Cost" + description paragraph.

3 stacked cards (rounded-2xl p-6 space-y-3):

Agency card: bg-muted/50. Title "Typical Agency charges minimum". Large price text-4xl font-bold. Subtitle: "+ Too much extra time & additional cost".

Freelancer card: bg-muted/50. Title "Regular Freelancer charges minimum". Large price text-4xl font-bold. Subtitle: "+ Too much headache & back-and-forth".

Your price card: bg-gradient-to-r from-pink-500 to-orange-500 text-white. Title "With Webfluin Studio". Price text-5xl font-bold. Subtitle: "Save your money, time & headache".

PRICING LOGIC:

calculatePrice():
  Base prices by service:
    design: base=399, perPage=100
    development: base=199, perPage=100
    both: base=499, perPage=200
  
  total = max(base, base + (pages - 1) * perPage)
  if needContent: total += pages * 50
  if needSEO: total += pages * 50
  if rush: total += pages * 100
  if fast: total += pages * 25

calculateAgencyCost():
  perPage = (both ? 1000 : 400)
  return 8000 + (pages - 1) * perPage

calculateFreelancerCost():
  perPage = (both ? 500 : 200)
  return 3000 + (pages - 1) * perPage

All prices displayed with .toLocaleString() and $ prefix.

State: serviceType (design|development|both, default both), pages (number, default 5), needContent (bool), needSEO (bool), timeline (regular|fast|rush, default regular).

Dependencies: Shadcn Slider component, useToast hook.
Prompt Yacht Club:
Build a luxury yacht club landing page as a single-page React + Vite + Tailwind CSS v4 application with the following exact specifications:

Tech Stack & Dependencies
React 19, Vite 6, TypeScript
Tailwind CSS v4 (using @tailwindcss/vite plugin)
motion (Framer Motion) for animations
gsap for the menu component animations
Google Fonts: "Instrument Serif" (regular + italic)
@fontsource-variable/geist for the sans-serif fallback
tw-animate-css and shadcn (Tailwind v4 integration)

Fonts
In index.css, import:
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
Set both --font-sans and --font-serif to "Instrument Serif", ui-serif, serif. The element uses font-serif class, all uppercase text throughout. The outer wrapper uses font-sans.

Layout Structure
Full-screen (min-h-screen, w-full) dark background (bg-slate-900), white text, overflow-hidden.

Layer Stack (z-index order, bottom to top):
z-0: Background video (autoplaying, looped, muted)
z-20: Main content (full viewport height, pointer-events-none)
z-30: Ripple trail effect layer (pointer-events-none)
z-40: Staggered navigation menu
z-50: "JOIN THE CLUB" button (bottom-right)
z-[110]: Fleet overlay (when open)
z-[120]: Fleet close button

Background Video
Full-screen video with object-cover, autoPlay, loop, muted, playsInline.
Video URL: https://pikaso.cdnpk.net/private/production/3822101633/802e6e4b-2153-4936-95ba-399380192202-0.mp4?token=exp=1775520000~hmac=4f96eccd6cbb48c06e27b5136096f4ab7708b3780ce5e55a845a605c79afc4ff
When the fleet overlay is open, the video blurs to blur(100px) over 1.56s with ease [0.19, 1, 0.22, 1]. When closing, it unblurs over 1.3s with the same ease.

Mouse Ripple Trail Effect
An SVG-filter-based liquid ripple trail that follows the mouse cursor:
SVG Filter (hidden): id="liquid-trail" using feTurbulence (fractalNoise, baseFrequency 0.02, 2 octaves) piped into feDisplacementMap (scale 30, R/G channel selectors).
Pool of 80 reusable div elements, absolutely positioned, rounded-full, opacity-0 initially.
Each ripple div uses backdropFilter: 'url(#liquid-trail) blur(1px)' and boxShadow: 'inset 0 0 30px rgba(255,255,255,0.1), 0 0 15px rgba(147,197,253,0.15)'.
On mousemove, if mouse moved >25px since last spawn, activate the next ripple in the circular buffer at the cursor position.
Each frame via requestAnimationFrame: increment age by 0.012. Size expands from 20px to 300px (20 + age * 280). Opacity fades as 1 - age^1.2. When age >= 1, deactivate.
willChange: 'transform, opacity, width, height, left, top' on each ripple div.

Hero Text (visible when fleet is NOT open)
Positioned absolute top-[96px] left-[20px] md:left-[96px], flex column, items-start.
Heading: text-[64px] md:text-[140px], font-normal, leading-none, drop-shadow-2xl, tracking-normal, uppercase.
Four lines, each wrapped in overflow-hidden:
Master The
(italic) Elements.
Embrace The
(italic) Ocean
Stagger animation: Parent uses staggerChildren: 0.12 on enter, staggerChildren: 0.06, staggerDirection: -1 on exit.
Text animation variants (textVariants):
hidden: { opacity: 0, y: 40, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } }
visible: { opacity: 1, y: 0, transition: { duration: 0.96, ease: [0.22, 1, 0.36, 1] } }

Subtext paragraph below the heading:
mt-8, ml-0 md:ml-[35%], translate-x-0 md:translate-x-[100px]
text-[10px] md:text-xs, font-normal, w-[260px], text-left md:text-justify, leading-relaxed, drop-shadow-md, tracking-widest
Text: "JOIN AN EXCLUSIVE COMMUNITY OF SAILORS. WHETHER YOU CRAVE THE THRILL OF THE OPEN SEA OR THE SERENITY OF A SUNSET CRUISE, YOUR NEXT GREAT ADVENTURE STARTS HERE."

"JOIN THE CLUB" Button
Positioned absolute bottom-8 right-8, z-50, pointer-events-none wrapper.
Uses the same textVariants for enter/exit animation.
Styling: px-6 py-3 text-[13px] md:px-12 md:py-5 md:text-[18px], font-normal, tracking-[0.15em], backdrop-blur-md, pointer-events-auto
Default state: bg-white text-black hover:bg-[#93c5fd]
When menu is open: bg-[#93c5fd] text-black hover:bg-white
When menu is open, slides left by translateX(calc(-1 * clamp(260px, 38vw, 420px))) with transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)
Hidden on mobile when menu is open (hidden md:block class toggle)
Text: JOIN THE + space + CLUB

Staggered Menu Component (GSAP-powered)
A full custom component (StaggeredMenu.jsx + StaggeredMenu.css) -- a slide-in side panel navigation.
Menu Items: Home, Our Fleet, Membership, Regattas & Events, Academy, Contact
Social Items: Instagram, Facebook, Twitter
Menu Behavior: Toggle button in top-right shows "MENU" / "CLOSE" with a vertical text-cycling animation (GSAP), plus a "+" icon that rotates 225deg to become an "x".
Toggle button container has backdrop-blur-[120px], bg-white/5, slides left when panel opens.
Pre-layers (colored slides) animate in from off-screen before the main white panel.
Menu items are 3.5rem font size, uppercase, black text on white panel, with counter numbering (CSS counters, decimal-leading-zero), accent color #93c5fd.
Items stagger in with GSAP: yPercent: 140, rotate: 10 -> yPercent: 0, rotate: 0 over 1s with power4.out.
Panel width: clamp(260px, 38vw, 420px) on desktop, 100% on mobile (<=1024px).
Socials section at bottom: title "Socials" in accent color, links in a horizontal row with hover-dim effect.
Close on click outside is enabled.

Fleet Overlay (triggered by "Our Fleet" menu item)
When isFleetOpen is true, a fixed full-screen overlay appears at z-[110].
Layout: Mobile vertical stack (h-[85vh] each), Desktop horizontal flex row (equal width flex-1), border-white.
3 Fleet Videos sliding in from x: '100vw' with staggered delays, duration 1.56s, ease [0.19, 1, 0.22, 1]. Exit reverses.
Video 1 - OCEAN ECLIPSE: LENGTH 28 M, CRUISING SPEED 22 KNOTS, GUESTS UP TO 12, CABINS 4 EN-SUITE
Video 2 - BLACK SOVEREIGN: LENGTH 24 M, TOP SPEED 45 KNOTS, HULL CARBON FIBER & KEVLAR, ENGINES TWIN V12 2000 HP
Video 3 - AZURE HORIZON: LENGTH 32 M, RANGE 1,500 NAUTICAL MILES, GUESTS 14 + 5 CREW, DECK SPACIOUS SUN DECK WITH JACUZZI
FleetVideo Component: hover-activated play/pause with staggered text animation and dark overlay.
Close Button: Fixed top-8 right-8, z-[120], mix-blend-difference, tracking-widest.

Color Palette: Primary accent #93c5fd, Background bg-slate-900, Menu panel white, No purple/indigo/violet.
Key Animation Easing: Hero text [0.22, 1, 0.36, 1], Fleet panel [0.19, 1, 0.22, 1], Menu button cubic-bezier(0.16, 1, 0.3, 1), GSAP power4.out/power3.in/power3.inOut/power2.out.
`;