# Invisible Instruments Website - MVP Plan

## Overview
Polished responsive showcase for Angel Wen's gesture-controlled invisible instruments (violin and cello).

## Creator
**Angel Wen** (@creativelyange)

## Instruments (Existing - Do Not Invent)

### 1. Invisible Violin ✅
- **Status**: Working playable app
- **Live URL**: https://newlegna.github.io/invisible-violin/
- **Source**: https://github.com/newlegna/invisible-violin
- **Title**: "Invisible Air Violin - Height Control (G Major)"
- **How it works**: 
  - Left arm height: selects strings
  - Left arm sideways: bowing motion
  - Right hand finger bends: add notes
  - Requires webcam
- **Implementation**: 
  - Primary: Embedded iframe (if feasible with camera permissions)
  - Fallback: Clear "Open in New Tab" CTA to live URL
  - No webcam/audio activation before intentional user click

### 2. Invisible Cello ⚠️
- **Status**: Demo exists, NO verified playable URL
- **Demo Post**: https://x.com/creativelyange/status/2111150255681270105
- **Implementation**:
  - Link to demo post with honest labeling
  - DO NOT claim it's playable
  - DO NOT guess or fabricate a playable URL
  - Optional: Try embedding if real URL discovered, with robust fallback

## Design Direction

### Visual Identity
- **Theme**: Dark stage / ivory contrast with restrained vivid accent
- **Typography**: Refined, music-lab aesthetic
- **Mood**: Editorial showcase meets interactive music lab
- **Mobile-first**: Responsive from small screens up

### Allowed Visuals
- ✅ Decorative illustrations (waveforms, string motifs, abstract music elements)
- ✅ Coherent color palette and typography
- ❌ Stock photos presented as Angel or her work
- ❌ Fake webcam footage or fabricated videos
- ❌ Invented product screenshots

### Accessibility
- Keyboard navigation
- Strong contrast ratios
- Reduced motion support
- Clear focus states

## Content Sections

### Hero
- "Invisible Instruments" title
- Concise human copy (not marketing fluff)
- Creator credit: Angel Wen / @creativelyange

### Instrument Sections (2)
Each section includes:
- Instrument name and visual distinction
- Short "how it works" description
- Honest CTA based on availability
- Clear technical requirements (webcam, browser)

### What NOT to Include
- ❌ Fake testimonials or quotes
- ❌ Fabricated statistics
- ❌ Contact forms or login
- ❌ Checkout or e-commerce
- ❌ Multiple pages (keep it single-page)
- ❌ Unrelated personal content

## Technical Stack

### Setup
1. **Scaffold**: `bunx create-vite invisible-instruments --template react-ts` with `--skip-install`
2. **Bun Config**: Create `bunfig.toml` with `[install] minimumReleaseAge = 259200` BEFORE install
3. **UI Framework**: shadcn/ui (minimalist init, components as needed)
4. **Styling**: Tailwind CSS (comes with Vite template)

### Requirements
- Static hosting friendly (Cloudflare Pages compatible)
- Self-contained: `bun install && bun run dev` to run
- No separate hosting projects
- Stay within `apps/invisible-instruments/` only

### Animation
- Intentional, purposeful motion
- Respect `prefers-reduced-motion`
- Avoid gratuitous effects

## Testing Checklist

### Build & Type Safety
- [ ] `bun run build` succeeds
- [ ] TypeScript compilation passes
- [ ] No console errors

### Browser Smoke Test
- [ ] Site loads in browser
- [ ] Violin CTA opens correct URL (https://newlegna.github.io/invisible-violin/)
- [ ] Cello CTA opens correct demo post
- [ ] Desktop layout works
- [ ] Mobile layout works
- [ ] Violin embed fallback works if embedding fails
- [ ] No webcam activation before user interaction

## Deliverables

### Code
- Working site in `apps/invisible-instruments/`
- Clean git history with descriptive commits

### Artifacts
1. **Screenshots**: Desktop AND mobile views
2. **Video**: Short screen recording of site navigation + violin launch
   - Note: Recording cannot demo actual hand tracking (no physical hands in VM)
   - Show navigation and launch process only

### Pull Request
- Branch: `cursor/invisible-instruments-39f0`
- Include screenshots and video in PR description
- Report any media/hosting blockers

## Out of Scope
- ❌ Modifying instrument source repos
- ❌ Creating separate hosting projects
- ❌ Editing files outside `apps/invisible-instruments/`
- ❌ Domain registration
- ❌ Publishing to production
- ❌ Merging PR (leave for review)

## Success Criteria
1. Site runs locally via `bun install && bun run dev`
2. Both instruments featured with correct working URLs
3. No false claims about cello playability
4. Screenshots (desktop + mobile) captured
5. Video demo recorded
6. PR opened with all artifacts
7. All changes scoped to `apps/invisible-instruments/`
