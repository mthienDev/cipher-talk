# CipherTalk Design Guidelines

**Version:** 1.0.0
**Date:** December 13, 2025
**Application:** CipherTalk - Secure Enterprise Chat Platform

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Icons](#icons)
7. [Security Indicators](#security-indicators)
8. [Animations & Micro-interactions](#animations--micro-interactions)
9. [Accessibility](#accessibility)
10. [Responsive Design](#responsive-design)

---

## Design Principles

### Core Values
- **Professional:** Enterprise-grade interface for 500+ user organizations
- **Secure:** Visual trust signals integrated throughout the experience
- **Clean:** Minimal clutter with clear information hierarchy
- **Accessible:** WCAG 2.1 AA compliant as minimum standard
- **Modern:** 2025 design trends with timeless foundations

### Design Philosophy
- **Dark mode first:** Default to dark UI (#121212 base) with light mode option
- **Mobile-first:** Design for smallest screens, scale up progressively
- **Encrypt-by-default:** Security visible but not alarming (Signal model)
- **Token-driven:** Consistent design tokens for theming and scalability

---

## Color System

### Dark Mode Palette (Default)

#### Foundation Colors
```css
/* Background layers */
--bg-primary: #080808;       /* Main app background - Deep charcoal */
--bg-secondary: #0f0f0f;     /* Sidebar, panels */
--bg-tertiary: #1a1a1a;      /* Cards, message bubbles */
--bg-elevated: #3E4F46;      /* Modals, dropdowns - Dark sage */

/* Surface colors */
--surface-default: #0f0f0f;
--surface-hover: #1a1a1a;
--surface-active: #3E4F46;   /* Active state - Dark sage */
```

#### Brand Colors
```css
/* Primary - Forest Green */
--primary-50: #f0f7f0;
--primary-100: #d9ead9;
--primary-200: #b3d5b3;
--primary-300: #8cc08c;
--primary-400: #66aa66;
--primary-500: #3A6A3A;       /* Main brand color - Forest green */
--primary-600: #2e5530;
--primary-700: #234026;
--primary-800: #172b1a;
--primary-900: #0c150d;

/* Accent - Sage Gray */
--accent-400: #79827E;        /* Medium gray for subtle emphasis */
--accent-500: #3E4F46;        /* Dark sage for E2E encryption indicator */
--accent-600: #2d3a33;
--accent-700: #1d2620;
```

#### Semantic Colors
```css
/* Success - Uses primary green */
--success: #3A6A3A;
--success-bg: #0c150d;

/* Warning */
--warning: #f59e0b;
--warning-bg: #78350f;

/* Error */
--error: #ef4444;
--error-bg: #7f1d1d;

/* Info - Uses primary green */
--info: #3A6A3A;
--info-bg: #0c150d;
```

#### Text Colors
```css
/* Text hierarchy */
--text-primary: #D5D5D7;      /* High emphasis - Light gray */
--text-secondary: #79827E;    /* Medium emphasis - Medium gray */
--text-tertiary: #3E4F46;     /* Low emphasis - Dark sage */
--text-disabled: #2d3a33;     /* Disabled state */
--text-inverse: #080808;      /* On primary/accent colors */
```

#### Border & Divider
```css
--border-default: #1a1a1a;
--border-subtle: #0f0f0f;
--border-emphasis: #3E4F46;   /* Uses dark sage for emphasis */
```

### Light Mode Palette (Optional)

```css
/* Background layers */
--bg-primary-light: #ffffff;
--bg-secondary-light: #f5f5f5;
--bg-tertiary-light: #e5e5e5;
--bg-elevated-light: #ffffff;

/* Text */
--text-primary-light: #0f0f0f;
--text-secondary-light: #525252;
--text-tertiary-light: #737373;

/* Borders */
--border-default-light: #e5e5e5;
```

---

## Typography

### Font Families

**Primary:** [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) - Modern, professional, excellent Vietnamese support
**Secondary:** [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) - Code snippets, encryption keys, monospace data

**Why IBM Plex?**
- Professional editorial aesthetic for enterprise
- Complete superfamily harmony (Sans + Mono)
- Excellent dark mode legibility
- Full Vietnamese character set (ă, â, đ, ê, ô, ơ, ư with diacritics)
- Open source (OFL license)

### Type Scale (8px base grid)

```css
/* Headings */
--text-5xl: 48px;   /* h1 - Page titles */
--text-4xl: 36px;   /* h2 - Section headers */
--text-3xl: 30px;   /* h3 - Sub-sections */
--text-2xl: 24px;   /* h4 - Card headers */
--text-xl: 20px;    /* h5 - List headers */
--text-lg: 18px;    /* h6 - Emphasis */

/* Body */
--text-base: 16px;  /* Body text, inputs */
--text-sm: 14px;    /* Captions, metadata */
--text-xs: 12px;    /* Timestamps, labels */
```

### Font Weights

```css
--font-light: 300;      /* Use sparingly (faint on dark) */
--font-regular: 400;    /* Body text */
--font-medium: 500;     /* Emphasized body, buttons */
--font-semibold: 600;   /* Headings, active states */
--font-bold: 700;       /* Strong emphasis */
```

### Line Heights

```css
--leading-tight: 1.25;  /* Headings */
--leading-normal: 1.5;  /* Body text (optimal readability) */
--leading-relaxed: 1.75; /* Long-form content */
```

### Usage Guidelines

- **Body text:** 16px minimum, 1.5 line-height
- **Headings:** 25%+ larger than body, bold weight
- **Message bubbles:** 16px regular, 1.5 line-height
- **Timestamps:** 12px medium, text-tertiary color
- **Code/encryption keys:** IBM Plex Mono, 14px regular

---

## Spacing & Layout

### 8px Grid System

All spacing uses multiples of 8px for visual consistency:

```css
--space-0: 0;
--space-1: 4px;    /* 0.5 units - Minimal spacing */
--space-2: 8px;    /* 1 unit - Base unit */
--space-3: 12px;   /* 1.5 units */
--space-4: 16px;   /* 2 units - Standard padding */
--space-5: 20px;   /* 2.5 units */
--space-6: 24px;   /* 3 units - Section spacing */
--space-8: 32px;   /* 4 units - Large spacing */
--space-10: 40px;  /* 5 units */
--space-12: 48px;  /* 6 units - Extra large */
--space-16: 64px;  /* 8 units - Section margins */
--space-20: 80px;  /* 10 units */
--space-24: 96px;  /* 12 units */
```

### Layout Grid

**Desktop (3-column):**
- Left sidebar: 280px fixed
- Center content: flex-grow (min 400px)
- Right panel: 320px fixed (optional)

**Tablet (2-column):**
- Sidebar: 240px (collapsible)
- Content: flex-grow

**Mobile (1-column):**
- Full width with hamburger sidebar
- Bottom navigation (optional)

### Breakpoints

```css
/* Mobile first */
--screen-sm: 640px;   /* Small tablets */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Laptops */
--screen-xl: 1280px;  /* Desktops */
--screen-2xl: 1536px; /* Large desktops */
```

---

## Components

### Buttons

**Variants:**

```css
/* Primary - Main actions */
.btn-primary {
  background: var(--primary-500);
  color: var(--text-inverse);
  padding: 10px 20px; /* 1.5 units vertical, 2.5 units horizontal */
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  min-height: 44px; /* WCAG touch target */
}

.btn-primary:hover {
  background: var(--primary-600);
}

.btn-primary:active {
  background: var(--primary-700);
  transform: scale(0.98);
}

/* Secondary - Alternative actions */
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

/* Ghost - Minimal actions */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--surface-hover);
}

/* Danger - Destructive actions */
.btn-danger {
  background: var(--error);
  color: white;
}
```

### Input Fields

```css
.input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  color: var(--text-primary);
  min-height: 44px;
}

.input:focus {
  border-color: var(--primary-500);
  outline: 2px solid rgba(59, 130, 246, 0.2);
  outline-offset: 0;
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Message Bubbles

```css
/* Sent messages (right-aligned) */
.message-sent {
  background: var(--primary-500);
  color: white;
  border-radius: 16px 16px 4px 16px;
  padding: 12px 16px;
  max-width: 70%;
  margin-left: auto;
  word-wrap: break-word;
}

/* Received messages (left-aligned) */
.message-received {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 16px 16px 16px 4px;
  padding: 12px 16px;
  max-width: 70%;
  margin-right: auto;
}

/* Message metadata */
.message-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

### Cards

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 24px;
}

.card-elevated {
  background: var(--bg-elevated);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 2px 4px -1px rgba(0, 0, 0, 0.2);
}
```

### Badges

```css
/* Unread count badge */
.badge {
  background: var(--primary-500);
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

/* Status badges */
.badge-success {
  background: var(--success-bg);
  color: var(--success);
}

.badge-warning {
  background: var(--warning-bg);
  color: var(--warning);
}

.badge-error {
  background: var(--error-bg);
  color: var(--error);
}
```

### Conversation List Item

```css
.conversation-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 150ms;
}

.conversation-item:hover {
  background: var(--surface-hover);
}

.conversation-item.active {
  background: var(--surface-active);
  border-left: 3px solid var(--primary-500);
}

.conversation-item.unread {
  font-weight: 600;
  color: var(--text-primary);
}
```

### Avatars

```css
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.avatar-lg {
  width: 56px;
  height: 56px;
  font-size: 20px;
}
```

---

## Icons

### Icon Library

**Primary:** [Lucide Icons](https://lucide.dev/) - Modern, consistent, highly customizable
**Secondary:** [Heroicons](https://heroicons.com/) - Tailwind-native for familiar enterprise patterns

**Why Lucide?**
- 1000+ icons (vs Heroicons 450+)
- Community-driven with rapid updates
- "Feather" aesthetic (simple, flexible)
- Excellent React/Vue integration
- Consistent 24x24px grid
- Stroke-based (scales perfectly)

### Icon Sizes

```css
--icon-xs: 16px;
--icon-sm: 20px;
--icon-md: 24px;  /* Default */
--icon-lg: 32px;
--icon-xl: 40px;
```

### Icon Usage

- **Navigation:** 24px icons with 16px gap to label
- **Buttons:** 20px icons with 8px gap to text
- **Message actions:** 16px icons (hover/tap)
- **Status indicators:** 16px icons, color-coded
- **Security badges:** 20px lock/shield icons

### Core Icon Set

```
Lock (lock)              - E2E encryption
Shield (shield-check)    - Verified contact
AlertCircle (alert-circle) - Security warning
Check (check)            - Read receipt
CheckCheck (check-check) - Delivered receipt
Phone (phone)            - Voice call
Video (video)            - Video call
Paperclip (paperclip)    - Attachments
Smile (smile)            - Emoji picker
Send (send)              - Send message
Search (search)          - Search
Settings (settings)      - Settings
Menu (menu)              - Hamburger menu
X (x)                    - Close/dismiss
ChevronDown (chevron-down) - Dropdown
Users (users)            - Group chat
```

---

## Security Indicators

### E2E Encryption Badge

**Design Pattern:** Lock icon + "Encrypted" text (Signal model)

```html
<div class="encryption-indicator">
  <svg class="icon-sm" stroke="currentColor"><!-- lock icon --></svg>
  <span class="text-xs text-success">Encrypted</span>
</div>
```

```css
.encryption-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-500);
  font-size: 12px;
  font-weight: 500;
}
```

**Placement:**
- Chat header (persistent)
- Conversation list (subtle icon)
- Message input area (confirmation)

### Verification Status

**Verified Contact:**
```html
<div class="verification-badge">
  <svg class="icon-sm"><!-- shield-check icon --></svg>
  <span>Verified</span>
</div>
```

```css
.verification-badge {
  background: var(--success-bg);
  color: var(--success);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

### Safety Number Display

**Pattern:** 12 groups of 5 digits (Signal model - accessible, language-agnostic)

```html
<div class="safety-number">
  <code class="font-mono">12345 67890 12345 67890 12345 67890</code>
  <code class="font-mono">12345 67890 12345 67890 12345 67890</code>
</div>
```

```css
.safety-number code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  line-height: 1.75;
}
```

### Security Warnings

**Severity Levels:**

```css
/* Info - Non-critical */
.security-alert-info {
  background: var(--info-bg);
  border-left: 3px solid var(--info);
}

/* Warning - Attention needed */
.security-alert-warning {
  background: var(--warning-bg);
  border-left: 3px solid var(--warning);
}

/* Error - Critical */
.security-alert-error {
  background: var(--error-bg);
  border-left: 3px solid var(--error);
}
```

**Pattern:** Context-specific, action-triggered (not alarming)

```html
<div class="security-alert security-alert-warning">
  <svg class="icon-md"><!-- alert-circle icon --></svg>
  <div>
    <p class="font-semibold">Safety number changed</p>
    <p class="text-sm text-secondary">Verify with [Contact Name]</p>
  </div>
  <button class="btn-ghost btn-sm">Verify</button>
</div>
```

---

## Animations & Micro-interactions

### Timing Standards

```css
/* Micro-interactions (<300ms) */
--duration-instant: 100ms;  /* Hover states */
--duration-fast: 150ms;     /* Button presses */
--duration-normal: 200ms;   /* Standard transitions */
--duration-slow: 300ms;     /* Drawer/modal appearance */

/* Navigation transitions (300-500ms) */
--duration-page: 400ms;     /* Page transitions */
--duration-modal: 350ms;    /* Modal open/close */
```

### Easing Functions

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Standard Animations

**Button Press:**
```css
.btn:active {
  transform: scale(0.98);
  transition: transform 150ms var(--ease-out);
}
```

**Typing Indicator:**
```html
<div class="typing-indicator">
  <span></span>
  <span></span>
  <span></span>
</div>
```

```css
.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--text-tertiary);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-8px); }
}
```

**Message Send:**
```css
.message-send-animation {
  animation: messageSend 300ms var(--ease-out);
}

@keyframes messageSend {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
```

**Skeleton Loading:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 25%,
    var(--surface-hover) 50%,
    var(--bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton 1.5s infinite;
}

@keyframes skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Motion Preferences

**Respect user preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Accessibility

### WCAG 2.1 AA Compliance Checklist

#### Color Contrast
- [ ] Normal text (16px): 4.5:1 minimum
- [ ] Large text (24px+): 3:1 minimum
- [ ] UI components: 3:1 minimum
- [ ] High contrast mode available

#### Keyboard Navigation
- [ ] All interactive elements keyboard-accessible
- [ ] Visible focus indicators (2px outline, primary color)
- [ ] Logical tab order
- [ ] No keyboard traps
- [ ] Skip navigation links

#### Screen Readers
- [ ] Semantic HTML (nav, main, article, aside)
- [ ] ARIA labels for icon-only buttons
- [ ] ARIA live regions for dynamic content
- [ ] Alt text for images
- [ ] Form labels associated with inputs

#### Touch Targets
- [ ] Minimum 44x44px (WCAG 2.1 AA)
- [ ] Adequate spacing between targets (8px+)
- [ ] No dragging-only interactions

#### Focus Management
```css
/* Visible focus indicator */
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Skip to main content */
.skip-to-main {
  position: absolute;
  left: -9999px;
  z-index: 999;
}

.skip-to-main:focus {
  left: 0;
  top: 0;
  padding: 12px 16px;
  background: var(--bg-elevated);
  color: var(--text-primary);
}
```

#### ARIA Patterns

**Chat message:**
```html
<div role="article" aria-label="Message from John Doe at 2:30 PM">
  <p>Message content</p>
</div>
```

**Live region for new messages:**
```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  New message from John Doe
</div>
```

**Button with icon only:**
```html
<button aria-label="Send message">
  <svg aria-hidden="true"><!-- send icon --></svg>
</button>
```

---

## Responsive Design

### Mobile-First Breakpoints

**Base (320px+):** Single column, full-width elements

**Small (640px+):** Adjusted spacing, two-column grids

**Medium (768px+):** Sidebar + content, tablet optimizations

**Large (1024px+):** Three-column layout, desktop patterns

**Extra Large (1280px+):** Maximum content width (1280px), centered

### Responsive Patterns

**Sidebar Navigation:**
```css
/* Mobile: Off-canvas sidebar */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: -280px;
    transition: left 300ms;
  }

  .sidebar.open {
    left: 0;
  }
}

/* Desktop: Persistent sidebar */
@media (min-width: 768px) {
  .sidebar {
    position: static;
    width: 280px;
  }
}
```

**Message Bubbles:**
```css
/* Mobile: 90% max width */
.message {
  max-width: 90%;
}

/* Desktop: 70% max width */
@media (min-width: 1024px) {
  .message {
    max-width: 70%;
  }
}
```

**Touch Considerations:**
- Minimum 44x44px tap targets (WCAG)
- Swipe gestures: Left for reply, right to archive
- Pull-to-refresh for message history
- Haptic feedback on send/reactions (Web Vibration API)

---

## Design Tokens (W3C Spec)

### Token Hierarchy

**Tier 1 - Foundation Tokens:**
```json
{
  "color": {
    "blue": {
      "500": "#3b82f6",
      "600": "#2563eb"
    }
  },
  "spacing": {
    "2": "8px",
    "4": "16px"
  }
}
```

**Tier 2 - Semantic Tokens:**
```json
{
  "color": {
    "action": {
      "primary": "{color.blue.500}",
      "primaryHover": "{color.blue.600}"
    }
  }
}
```

**Tier 3 - Component Tokens:**
```json
{
  "button": {
    "primary": {
      "background": "{color.action.primary}",
      "backgroundHover": "{color.action.primaryHover}"
    }
  }
}
```

---

## Implementation Notes

### Tailwind CSS Configuration

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        accent: '#10b981',
        bg: {
          primary: '#0f0f0f',
          secondary: '#1a1a1a',
          tertiary: '#242424'
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      },
      spacing: {
        // 8px grid
      }
    }
  }
}
```

### shadcn/ui Integration

Install recommended components:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card avatar badge
npx shadcn-chat@latest init  # Chat-specific components
```

---

## Resources

### Design References
- [Telegram Design](https://telegram.org/)
- [Signal Design](https://signal.org/)
- [Slack Design System](https://slack.design/)
- [Discord Design](https://discord.com/branding)

### Tools
- [IBM Plex Fonts](https://fonts.google.com/specimen/IBM+Plex+Sans)
- [Lucide Icons](https://lucide.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Theme Management (NEW - v1.3.0)

### Theme Store Architecture

**File:** `apps/web/src/stores/theme-store.ts`

Theme management implemented with Zustand + persist middleware:

```typescript
interface ThemeStore {
  theme: ThemeMode;           // 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void;  // Set theme explicitly
  toggleTheme: () => void;    // Toggle between light/dark
  initTheme: () => void;      // Initialize from localStorage or system preference
}
```

**Features:**
- Persistent storage via localStorage key `'ciphertalk-theme'`
- System preference fallback (prefers-color-scheme media query)
- FOUC (Flash of Unstyled Content) prevention script in index.html
- Synchronized theme application to document root class

**Theme Application:**
```typescript
// Applies 'dark' class to <html> element
// CSS automatically handles light/dark colors via Tailwind darkMode: 'class'
if (theme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
```

### Theme Toggle Component

**File:** `apps/web/src/components/theme-toggle.tsx`

UI button for theme switching with icon feedback:

```typescript
export function ThemeToggle() {
  // Uses useThemeStore hook
  // Displays Sun icon (dark mode) or Moon icon (light mode)
  // WCAG compliant: 44x44px minimum, proper focus ring
}
```

**Accessibility:**
- Min size: 44x44px (touch target)
- Focus ring: 2px primary-500 with offset
- ARIA labels and title attribute for screen readers
- Icon transitions smooth theme switching

### FOUC Prevention

**Script Location:** `apps/web/index.html` (before React mount)

Executes immediately on page load:
1. Reads stored theme from localStorage
2. Checks system preference if no stored value
3. Applies dark class to document.documentElement
4. Prevents white flash on dark-mode preference

Critical: Script must run before Tailwind applies styles.

### Light Mode Palette Addition

Dark mode remains default. Light mode colors via Tailwind darkMode: 'class':

**Light Mode Colors:**
```css
Light background: #ffffff
Light secondary: #f5f5f5
Light text primary: #0f0f0f
Light text secondary: #525252
Light borders: #e5e5e5
```

Inherited from design guidelines + Tailwind defaults.

---

## Changelog

**v1.3.0 (2025-12-15):**
- **Theme Toggle Feature:** Full light/dark mode implementation
- New useThemeStore (Zustand + persist) for theme management
- ThemeToggle component integrated in Header
- FOUC prevention script in index.html
- Support for system preference (prefers-color-scheme)
- localStorage persistence with fallback to system setting
- Light mode palette added (complements dark mode)
- Header component now includes theme toggle button
- App.tsx initializes theme on mount via useEffect

**v1.2.0 (2025-12-15):**
- **Major Color Palette Update:** Transitioned from blue to forest green theme
- Primary color: #3A6A3A (Forest Green) - replaces #3b82f6 (Professional Blue)
- Updated background layers: #080808 (primary), #0f0f0f (secondary), #1a1a1a (tertiary)
- New accent colors: #3E4F46 (Dark Sage), #79827E (Medium Gray)
- Updated text hierarchy: #D5D5D7 (primary), #79827E (secondary), #3E4F46 (tertiary)
- All components updated with new color palette (LoginPage, buttons, inputs, badges)
- Maintained WCAG 2.1 AA contrast compliance across all color combinations
- Updated Tailwind CSS v4 configuration with new theme colors

**v1.1.0 (2025-12-15):**
- Added LoginPage component implementation
- Documented authentication page patterns
- Added gradient background effects
- Implemented password visibility toggle
- Added loading states for async actions
- Enhanced security badge patterns

**v1.0.0 (2025-12-13):**
- Initial design system
- Dark mode palette
- IBM Plex typography
- Lucide icons
- Security indicator patterns
- Accessibility guidelines
- Component library

---

**Next Review:** Q1 2026 or upon major feature additions
