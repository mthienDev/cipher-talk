# Security Design Patterns: Telegram & Signal

## E2E Encryption Visual Indicators

**Signal:**
- Default encryption for all chats (no visual badge needed due to universal E2EE)
- Safety number: 12 groups of 5 digits (numeric for language-agnostic clarity)
- QR code verification in-person (reduced from dual-scan to single-scan)

**Telegram:**
- Lock icon next to contact name for Secret Chats (green background in chat list)
- "Secret chat" header confirmation in conversation
- Encryption key visualization (abstract patterns or text representation)

**Key Pattern:** Lock/shield icons for E2EE status. Numeric representations preferred over hexadecimal for accessibility.

## Security Badge Design

**Trust Signals:**
- Business verification badges (Telegram) for authentic company identification
- Safety number verification indicator (Signal) - accessible term over "fingerprint"
- QR code visual validation (both apps)

**Design Principle:** Simplicity > technical jargon. Users avoid "fingerprint" metaphor; prefer "safety number."

## Privacy-Focused UI Patterns

**Telegram's Trinity:**
- Speed, simplicity, security as design pillars
- Blue/white color scheme (blue for actions & unread counters)
- Rooted/jailbroken device warnings

**Signal's Transparency:**
- No hidden encryption settings (default-on eliminates confusion)
- Clear permission visibility (inline bot access notifications)
- Screenshot/recording protection available

**Key Pattern:** Default-secure over opt-in security. Clear permission disclosure.

## Verification Flows

**Device Verification (Signal):**
- X3DH key agreement protocol establishes mutual authentication
- PQXDH for post-quantum forward secrecy & device transitions
- QR code scan + numeric comparison (dual verification options)

**Usability Challenge:** ~50% user failure in key comparisons without UX improvements.

**Best Practice:** Reduce comparison surface (single QR scan vs. dual scans). Use accessible metaphors.

## Security Warnings

**Visual Cues:**
- Rooted/jailbroken device warnings (Telegram)
- Inline bot first-use warnings with clarity on message access
- "Bot has access to X" indicators in groups
- Encryption key mismatch alerts (changes trigger notifications)

**Pattern:** Warn at action point, not at app launch. Context-specific warnings reduce alarm fatigue.

## Safe File Sharing UI

**Patterns:**
- Photo picker (modern OS provides temporary read access without permissions)
- Permission requests at interaction moment (not app start)
- Role-based access controls for group members
- Screenshot/recording disabling (prevent unintended capture)

**Principle:** Minimal upfront permissions. Just-in-time permission requests.

## Permission Request Patterns

**Modern Approach:**
- Runtime permissions (ask when needed, not on install)
- Request minimum permissions for feature completion
- Relinquish permissions post-use
- Offer alternative actions if permission denied

**UX Impact:** Interrupts user flow but respects privacy. Request specificity increases grant rates.

## Implementation Takeaways

1. **Visual Hierarchy:** Lock icon + text confirmation > badge alone
2. **Terminology:** Use "safety number" not "fingerprint"; "secret chat" not "E2EE mode"
3. **Verification:** Single QR scan + numeric backup (not dual-requirement)
4. **Defaults:** Encrypt-by-default reduces user confusion (Signal model)
5. **Warnings:** Context-specific, action-triggered, not alarming
6. **Permissions:** Just-in-time > upfront; show access scope clearly
7. **Trust:** Simplicity + transparency > technical assurance

---

## Unresolved Questions

- How do apps handle E2EE status changes in group conversations?
- What's optimal warning fatigue threshold for security notifications?
- Signal usability study: post-redesign verification success rates?
- Telegram business badges: anti-spoofing design specifics?
- Cross-platform sync for encryption key visual verification?
