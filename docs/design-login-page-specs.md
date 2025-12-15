# Login Page Design Specifications

**Component:** LoginPage.tsx
**Date:** December 15, 2025
**Status:** Production Ready

---

## Visual Hierarchy

```
┌─────────────────────────────────────────┐
│         [Background Gradients]          │
│                                         │
│  ┌────────────────────────────────┐    │
│  │   🔒 CipherTalk               │    │
│  │   Secure enterprise chat...    │    │
│  │   [🛡️ End-to-End Encrypted]   │    │
│  │                                │    │
│  │  ┌──────────────────────────┐ │    │
│  │  │ [Error Message]          │ │    │
│  │  │                          │ │    │
│  │  │ Email address            │ │    │
│  │  │ [📧] [Input Field]       │ │    │
│  │  │                          │ │    │
│  │  │ Password                 │ │    │
│  │  │ [🔒] [Input Field] [👁️] │ │    │
│  │  │                          │ │    │
│  │  │ ☐ Remember me            │ │    │
│  │  │        Forgot password?  │ │    │
│  │  │                          │ │    │
│  │  │ [    Sign In Button    ] │ │    │
│  │  │                          │ │    │
│  │  │ ────New to CipherTalk?── │ │    │
│  │  │                          │ │    │
│  │  │ [  Create an account   ] │ │    │
│  │  └──────────────────────────┘ │    │
│  │                                │    │
│  │  By signing in, you agree...  │    │
│  └────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Background Layer
- **Background Color:** #0f0f0f (base)
- **Gradient Orbs:**
  - Top-right: Blue (#3b82f6/10) 320px blur
  - Bottom-left: Green (#10b981/10) 320px blur
- **Purpose:** Subtle depth, brand color presence

### 2. Brand Header
**Logo Container:**
- Size: 48x48px
- Background: #3b82f6/10 with border #3b82f6/20
- Border radius: 12px
- Icon: Lock (24px, #3b82f6)

**Text:**
- Font: IBM Plex Sans, 24px, semibold (600)
- Color: #f5f5f5
- Alignment: Center, gap 12px with logo

**Tagline:**
- Font: IBM Plex Sans, 14px, regular (400)
- Color: #a3a3a3 (secondary text)

### 3. Security Badge
- **Container:**
  - Background: #064e3b (success bg)
  - Border radius: 9999px (full pill)
  - Padding: 6px 12px
  - Display: inline-flex, gap 8px
- **Icon:** Shield (16px, #10b981)
- **Text:** "End-to-End Encrypted" (12px, #10b981, medium)

### 4. Form Card
**Container:**
- Max width: 440px
- Background: #1a1a1a (secondary)
- Border: 1px solid #2a2a2a
- Border radius: 12px
- Padding: 32px (8px × 4)
- Shadow: 0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)

**Spacing:**
- Form elements: 24px gap (space-y-6)
- Input sections: 8px gap (space-y-2)

### 5. Input Fields
**Label:**
- Font: IBM Plex Sans, 14px, medium (500)
- Color: #f5f5f5
- Margin bottom: 8px

**Input:**
- Background: #242424 (tertiary)
- Border: 1px solid #2a2a2a
- Border radius: 8px
- Padding: 12px left icon, 16px right
- Min height: 44px (WCAG)
- Font: IBM Plex Sans, 16px, regular (400)
- Color: #f5f5f5

**Focus State:**
- Border: #3b82f6
- Box shadow: 0 0 0 2px rgba(59, 130, 246, 0.2)

**Icons:**
- Size: 20px
- Color: #737373 (tertiary text)
- Position: Absolute left/right, centered vertically

### 6. Buttons

**Primary (Sign In):**
- Background: #3b82f6
- Hover: #2563eb
- Active: Scale 0.96
- Text: #ffffff, 16px, medium (500)
- Min height: 44px
- Border radius: 8px
- Full width

**Secondary (Create Account):**
- Background: transparent
- Hover: #242424
- Border: 1px solid #2a2a2a
- Text: #f5f5f5, 16px, medium (500)
- Min height: 44px
- Border radius: 8px
- Full width

### 7. Error State
- Background: #7f1d1d (error bg)
- Border left: 4px solid #ef4444
- Border radius: 8px
- Padding: 16px
- Text: #ef4444, 14px, regular (400)

### 8. Links
**Forgot Password:**
- Color: #3b82f6
- Hover: #60a5fa
- Font: 14px, medium (500)

**Create Account:**
- Styled as secondary button (see above)

---

## Spacing System (8px Grid)

| Element | Value | Units |
|---------|-------|-------|
| Card padding | 32px | 4 units |
| Form gap | 24px | 3 units |
| Input padding | 12px/16px | 1.5/2 units |
| Button height | 44px | 5.5 units |
| Label margin | 8px | 1 unit |
| Icon size | 20px | 2.5 units |
| Border radius (card) | 12px | 1.5 units |
| Border radius (inputs) | 8px | 1 unit |

---

## Typography Scale

| Element | Size | Weight | Color | Line Height |
|---------|------|--------|-------|-------------|
| Brand name | 24px | 600 | #f5f5f5 | 1.25 |
| Tagline | 14px | 400 | #a3a3a3 | 1.5 |
| Input label | 14px | 500 | #f5f5f5 | 1.5 |
| Input text | 16px | 400 | #f5f5f5 | 1.5 |
| Button text | 16px | 500 | #ffffff | 1.5 |
| Link text | 14px | 500 | #3b82f6 | 1.5 |
| Error text | 14px | 400 | #ef4444 | 1.5 |
| Security badge | 12px | 500 | #10b981 | 1.5 |
| Footer text | 12px | 400 | #737373 | 1.5 |

---

## Color Palette Reference

### Background Colors
```css
--bg-primary: #0f0f0f;    /* Page background */
--bg-secondary: #1a1a1a;  /* Card background */
--bg-tertiary: #242424;   /* Input background */
```

### Brand Colors
```css
--primary-500: #3b82f6;   /* Main blue */
--primary-600: #2563eb;   /* Hover blue */
--primary-400: #60a5fa;   /* Light blue (links) */
--accent-500: #10b981;    /* Security green */
```

### Text Colors
```css
--text-primary: #f5f5f5;   /* High emphasis */
--text-secondary: #a3a3a3; /* Medium emphasis */
--text-tertiary: #737373;  /* Low emphasis */
--text-inverse: #ffffff;   /* On primary buttons */
```

### Semantic Colors
```css
--error: #ef4444;          /* Error text */
--error-bg: #7f1d1d;       /* Error background */
--success: #10b981;        /* Success/security */
--success-bg: #064e3b;     /* Success background */
```

### Border Colors
```css
--border-default: #2a2a2a; /* Standard borders */
--border-subtle: #1f1f1f;  /* Subtle dividers */
```

---

## Icon Usage

| Icon | Component | Size | Color | Position |
|------|-----------|------|-------|----------|
| Lock | Logo | 24px | #3b82f6 | Center |
| Shield | Security badge | 16px | #10b981 | Left |
| Mail | Email input | 20px | #737373 | Left prefix |
| Lock | Password input | 20px | #737373 | Left prefix |
| Eye | Show password | 20px | #737373 | Right suffix |
| EyeOff | Hide password | 20px | #737373 | Right suffix |

---

## Responsive Behavior

### Mobile (320px - 767px)
- Full viewport width with 16px padding
- Card: 100% width minus padding
- All inputs: Full width
- Touch targets: Minimum 44px
- Font sizes: Same as desktop (minimum 16px)

### Tablet (768px - 1023px)
- Card: 440px max width, centered
- Gradients: Full viewport
- Same layout as desktop

### Desktop (1024px+)
- Card: 440px max width, centered
- Gradients: Larger blur radius
- Hover states: Enabled
- Focus states: 2px outline

---

## Animation Timings

| Interaction | Duration | Easing | Effect |
|-------------|----------|--------|--------|
| Button hover | 150ms | ease-out | Background color |
| Button active | 100ms | ease-out | Scale 0.96 |
| Input focus | 200ms | ease-in-out | Border + shadow |
| Loading spinner | 1000ms | linear | Rotate 360° |
| Link hover | 150ms | ease-out | Color change |

---

## Accessibility Features

### WCAG 2.1 AA Compliance
- ✅ Color contrast ratios exceed 4.5:1
- ✅ Touch targets minimum 44x44px
- ✅ Keyboard navigation full support
- ✅ Focus indicators visible (2px outline)
- ✅ Semantic HTML structure
- ✅ ARIA labels on icon-only buttons
- ✅ Form labels associated with inputs
- ✅ Error messages descriptive

### Screen Reader Support
- Email input: "Email address" label
- Password input: "Password" label
- Show/hide button: "Show password" / "Hide password" aria-label
- Error alert: role="alert" for announcements

### Keyboard Navigation
1. Tab: Email input
2. Tab: Password input
3. Tab: Show/hide password button
4. Tab: Remember me checkbox
5. Tab: Forgot password link
6. Tab: Sign in button
7. Tab: Create account link

---

## Loading States

### Sign In Button (isPending)
- Background: #3b82f6 (same)
- Opacity: 0.5
- Cursor: not-allowed
- Text: "Signing in..."
- Icon: Spinning circle (20px)

### Spinner Animation
```css
animation: spin 1s linear infinite
rotate: 0deg → 360deg
```

---

## Error Handling

### Display Conditions
- Shows when `error` is truthy from useLogin hook
- Positioned above email input
- Full width within card

### Message Format
- Default: "Login failed. Please check your credentials."
- Custom: Uses error.message if Error instance

### Visual Treatment
- Background: #7f1d1d (dark red)
- Border left: 4px solid #ef4444 (bright red)
- Text: #ef4444
- Padding: 16px
- Border radius: 8px

---

## State Management

### Local State
```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [rememberMe, setRememberMe] = useState(false);
```

### Auth Hook State
```typescript
const { mutate: login, isPending, error } = useLogin();
```

### Navigation
```typescript
const navigate = useNavigate();
// On success: navigate('/');
```

---

## Integration Points

### Routes
- Current: `/login`
- Redirect success: `/`
- Link to register: `/register`
- Link to reset: `/forgot-password` (not implemented)

### API
- Hook: `useLogin()` from `../hooks/use-auth`
- Payload: `{ email, password }`
- Success: Sets auth token, user data
- Error: Displays error message

### Storage
- `localStorage.setItem('rememberMe', 'true')` on checkbox

---

## File Location

**Component File:**
```
apps/web/src/features/auth/components/LoginPage.tsx
```

**Usage in App:**
```tsx
import { LoginPage } from './features/auth/components/LoginPage';

<Route path="/login" element={<LoginPage />} />
```

---

## Dependencies

- react (useState)
- react-router-dom (useNavigate, Link)
- lucide-react (Lock, Eye, EyeOff, Shield, Mail)
- ../hooks/use-auth (useLogin)
- ../../../lib/utils (cn helper)

---

**End of Specifications**
