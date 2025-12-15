# Theme Toggle Implementation Plan

**Date:** December 15, 2025
**Priority:** Medium
**Status:** Ready for Implementation

---

## Overview

Implement light/dark theme toggle feature for CipherTalk web app using Zustand state management, Tailwind CSS v4 dark mode, and system preference detection with FOUC prevention.

**Current State:**
- Hardcoded dark theme with CSS variables
- Tailwind v4 configured with @theme directive
- Forest green color palette (#3A6A3A primary)
- NO theme toggle UI or state management

**Goal:**
- Toggle button in header
- Persistent theme preference (localStorage)
- System preference detection fallback
- Zero flash on page load (FOUC prevention)
- WCAG 2.1 AA accessible

---

## Implementation Phases

### [Phase 01: Theme Toggle Implementation](./phase-01-theme-toggle.md)
**Status:** ✅ Complete (2025-12-15 15:45)
**Scope:** Zustand store, toggle component, FOUC prevention, light mode CSS, accessibility

---

## Success Criteria

- [x] Theme persists across browser sessions
- [x] No flash of unstyled content (FOUC) on page load
- [x] Toggle button in header with icon feedback
- [x] System preference respected when no user choice stored
- [x] Light/dark modes maintain WCAG AA contrast ratios
- [x] Keyboard accessible (Space/Enter to toggle)
- [x] Works across all authenticated pages

---

## Resources

**Research Report:**
`plans/reports/researcher-2025-12-15-react-theme-implementation.md`

**Design Guidelines:**
`docs/design-guidelines.md` (Light mode palette: lines 116-132)

**Codebase:**
- Current header: `apps/web/src/components/header.tsx`
- Auth store pattern: `apps/web/src/stores/auth-store.ts`
- Tailwind config: `apps/web/src/index.css` (@theme directive)
