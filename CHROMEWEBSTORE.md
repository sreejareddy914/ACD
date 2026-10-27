# Chrome Web Store Listing — ClearChoice AI

**Last Updated:** October 10, 2026  
**Extension Name:** ClearChoice AI  
**Subtitle / Summary:** AI-Powered Dark Pattern Detection  
**Version:** 1.0.0  

---

## 1. Store Metadata

### Title
`ClearChoice AI — Dark Pattern Detection`

### Short Description (max 132 chars)
`Detect deceptive designs, fake countdowns, hidden charges, and sneaky subscription traps on any webpage in real-time.`

### Detailed Description

Protect yourself from deceptive website interfaces and manipulative pricing tricks while browsing online.

ClearChoice AI acts as your personal digital consumer protection assistant. It analyzes shopping, subscription, travel, and job portals in real-time, uncovering artificial urgency, hidden charges, forced sign-up barriers, and deceptive opt-out choices before you pay or share sensitive information.

### What ClearChoice AI Detects:
* **Fake Urgency & Artificial Deadlines:** Identifies ticking countdown clocks, repeated deadline warnings, and flash-sale pressure.
* **Fake Scarcity & FOMO:** Flags suspicious low-stock claims ("Only 2 left!") and synthetic viewer counters.
* **Misleading Discounts:** Mathematically verifies claimed discounts against displayed reference and sale prices to expose fake bargains.
* **Hidden Charges & Drip Pricing:** Catches undisclosed convenience, platform, and handling fees added late in the checkout flow.
* **Subscription Traps & Continuity:** Uncovers free trials that convert into expensive automatic recurring renewals buried in fine print.
* **Difficult Cancellation (Roach Motel):** Warns about services requiring phone calls or letters to cancel an online subscription.
* **Confirmshaming:** Highlights guilt-inducing opt-out buttons ("No thanks, I hate saving money").
* **Preselected Paid Add-Ons:** Detects pre-checked warranties, insurance, and marketing opt-ins before you buy.
* **Asymmetric Privacy Choices:** Flags cookie banners that emphasize "Accept All" while hiding or omitting simple "Reject All" options.
* **Suspicious Job & Training Offers:** Warns against upfront interview fees and absolute placement guarantees.

### Key Features:
* **Compact Side Panel:** Remains open on the right side of the screen so the webpage stays visible and interactive.
* **Instant Risk Score:** Clear 0–100 risk rating with color-coded safety indicators (Low, Moderate, High, Very High).
* **Element Highlighting:** Jump directly to suspicious elements on the webpage with a single click.
* **Actionable Advice:** Clear, practical recommendations for every detected pattern.
* **Local-First & Privacy Conscious:** Deterministic local engine runs entirely in your browser without transmitting your data.
* **Audit Reports:** Export structured security audit reports in plain text or JSON for documentation.

---

## 2. Permissions Justification

| Permission | Justification |
| :--- | :--- |
| `sidePanel` | Allows the ClearChoice AI inspection panel to remain open side-by-side with the current webpage while you browse, compare prices, and review findings. |
| `storage` | Saves your personal extension settings, minimized panel display preference, and local audit history securely and privately on your own device. |
| `tabs` | Identifies the active webpage URL and title to check your personal allowlist and verify page security contexts. |
| `scripting` | Enables the extension to safely extract visible interface elements and highlight deceptive items on the active webpage when you request it. |
| `contextMenus` | Provides a convenient right-click context menu shortcut to toggle the on-page ClearChoice AI analysis panel. |
| `host_permissions` (`http://*/*`, `https://*/*`) | Required to analyze shopping, travel, SaaS, and job websites across the web for deceptive interface elements when you visit a webpage. |

---

## 3. Privacy & Data Use Disclosure

ClearChoice AI was designed with privacy-by-default architecture:
1. **Zero Credential Access:** ClearChoice AI strictly ignores and never collects password inputs, credit card numbers, CVVs, one-time passwords (OTPs), authentication cookies, or tokens.
2. **Local Processing:** The primary detection engine executes deterministically directly inside your browser. No browsing data is ever sold, monetized, or shared with advertisers.
3. **Optional AI Analysis:** If you configure an external AI backend, only anonymized, sanitized visible element labels are evaluated under strict request limits.
4. **Data Deletion:** You can view, delete, or clear your local scan history at any time with a single click in Extension Settings.

---

## 4. Version History

* **v1.0.0 (October 10, 2026):** Initial release.
  - Full support for 23 dark pattern detection categories.
  - Chrome Side Panel API integration with responsive UI.
  - Deterministic mathematical discount verification (USD, EUR, GBP, INR).
  - On-page element highlighting and smooth scroll navigation.
  - Local scan history and exportable security audit reports.
  - Configurable AI backend integration with offline fallback.
