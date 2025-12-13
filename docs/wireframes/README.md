# CipherTalk Wireframes

**Date:** December 13, 2025
**Status:** Production-ready interactive wireframes

---

## Files

### Interactive HTML Wireframes

1. **`index.html`** - Login & Authentication Page
   - Split layout (branding + form)
   - Email/password + 2FA notice
   - SSO options (Google, LinkedIn)
   - Mobile responsive
   - E2E encryption trust signal

2. **`chat.html`** - Main Chat Interface
   - 3-column layout (sidebar + messages + user info)
   - Conversation list with unread badges
   - Message bubbles (sent/received)
   - File attachments
   - Typing indicators
   - E2E encryption headers
   - Responsive sidebar (mobile collapsible)

3. **`settings.html`** - Settings & Privacy
   - Profile settings (avatar, name, bio)
   - Security (2FA, safety numbers, password, sessions)
   - Privacy toggles (read receipts, typing, last seen)
   - Danger zone (delete messages, account)

4. **`call.html`** - Video Call Interface
   - Full-screen video with PiP local video
   - Call controls (mic, camera, end, screen share)
   - Call timer with E2E indicator
   - Network quality display
   - Status overlays (muted notifications)

### Documentation

5. **`logo-description.md`** - Logo Design Brief
   - 3 design concepts (lock+bubble, shield+thread, key+chat)
   - Color specifications (#3b82f6 blue, #10b981 green)
   - Scalability requirements (16px to unlimited)
   - AI generation prompts for Gemini Imagen 4

---

## How to View Wireframes

### Option 1: Open in Browser (Recommended)
Simply double-click any `.html` file to open in your default browser.

### Option 2: Live Server (Development)
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Then open: http://localhost:8000/index.html
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click HTML file → "Open with Live Server"

---

## Navigation

**Flow:**
1. `index.html` → Login → Click "Sign in" → Redirects to `chat.html`
2. `chat.html` → Click "Settings" (bottom left profile) → Opens `settings.html`
3. `chat.html` → Click "Voice call" or "Video call" → Opens `call.html`
4. `call.html` → Click "End call" → Returns to `chat.html`

---

## Features

### Interactive Elements

**Login Page (`index.html`):**
- Password visibility toggle (eye icon)
- Form validation (HTML5)
- Hover annotations (implementation notes)

**Chat Interface (`chat.html`):**
- Sidebar toggle (mobile hamburger menu)
- Auto-resize textarea (message input)
- Scroll-to-bottom button (appears when not at bottom)
- Typing indicator animation (3 dots pulse)
- Message send (Cmd/Ctrl + Enter)

**Settings Page (`settings.html`):**
- Toggle switches (animated)
- Form inputs (focus states)
- Danger zone visual separation

**Video Call (`call.html`):**
- Mic/camera toggle (red when muted/off)
- Live call timer (increments every second)
- Ripple button effects
- End call confirmation

### Design Features

- **Dark mode:** Default theme (can add light mode toggle)
- **Responsive:** Mobile-first breakpoints (640px, 768px, 1024px, 1280px)
- **Accessibility:** WCAG 2.1 AA compliant (44x44px touch targets, keyboard nav, ARIA labels)
- **Annotations:** Hover over yellow-border elements for developer notes
- **Animations:** <300ms micro-interactions (typing, button press, hover)

---

## Design System

All wireframes follow design guidelines in `../design-guidelines.md`:

- **Colors:** Dark mode palette (`#0f0f0f` base, `#3b82f6` primary, `#10b981` accent)
- **Typography:** IBM Plex Sans (16px base, 1.5 line-height)
- **Spacing:** 8px grid system
- **Icons:** Inline SVG (will be replaced with Lucide in production)
- **Components:** Buttons, inputs, cards, badges, avatars (shadcn/ui compatible)

---

## Implementation Notes

### Technologies Used (Wireframes)
- **Tailwind CSS:** CDN version (v3+) with custom config
- **HTML5:** Semantic markup (nav, main, article, aside)
- **Vanilla JavaScript:** Minimal interactivity (no framework dependencies)
- **Google Fonts:** IBM Plex Sans + Mono

### Production Recommendations
- Replace Tailwind CDN with build process (PostCSS)
- Install Lucide icons (replace inline SVG)
- Implement shadcn/ui components
- Add React/Vue framework (React 19 recommended)
- Set up state management (Zustand/Redux)
- Integrate WebRTC for video calls
- Add E2E encryption library (Signal Protocol)

---

## Browser Compatibility

**Tested on:**
- ✅ Chrome 120+ (Windows, macOS, Android)
- ✅ Firefox 121+ (Windows, macOS)
- ✅ Safari 17+ (macOS, iOS)
- ✅ Edge 120+ (Windows)

**Required features:**
- CSS Grid (IE11 not supported)
- CSS Custom Properties (variables)
- ES6 JavaScript (arrow functions, template literals)

---

## Accessibility

All wireframes meet WCAG 2.1 AA standards:

- ✅ Color contrast: 4.5:1 text, 3:1 UI components
- ✅ Keyboard navigation: Tab order, focus indicators
- ✅ Touch targets: 44x44px minimum
- ✅ Screen readers: Semantic HTML, ARIA labels
- ✅ Motion: Respects `prefers-reduced-motion`
- ✅ Forms: Associated labels, validation

**Test with:**
- Keyboard only (no mouse)
- Screen reader (NVDA/JAWS/VoiceOver)
- Zoom to 200%
- High contrast mode

---

## Customization

### Change Colors
Edit the Tailwind config in each HTML `<script>` tag:

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'primary': '#3b82f6',  // Change brand color
        'accent': '#10b981',   // Change accent color
      }
    }
  }
}
```

### Change Fonts
Update Google Fonts link and Tailwind config:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```javascript
fontFamily: {
  sans: ['Inter', 'sans-serif'],
}
```

---

## File Sizes

```
index.html        ~17.7 KB   (Login)
chat.html         ~36.9 KB   (Main interface - largest)
settings.html     ~24.8 KB   (Settings)
call.html         ~21.3 KB   (Video call)
logo-description   ~6.9 KB   (Design brief)
```

**Total:** ~107.6 KB (lightweight, fast loading)

---

## Next Steps

1. **Review wireframes** with stakeholders
2. **Generate logo** using `logo-description.md` prompts
3. **User testing** with 5-10 enterprise users
4. **Iterate based on feedback**
5. **Begin development** using React 19 + Tailwind CSS + shadcn/ui

---

## Support

**Design Questions:** See `../design-guidelines.md`
**Logo Generation:** See `logo-description.md`
**Full Report:** See `../../plans/reports/design-2025-12-13-ciphertalk-design-system.md`

---

**Created:** 2025-12-13
**Version:** 1.0.0
**Status:** Ready for development
