---
trigger: always_on
---

# Project Rules
- Activate your `/ui-ux-pro-max` skill for all Frontend tasks.
- Exclusively use HeroUI (v3) components and follow its Compound Component pattern.
- Strictly use HeroUI theme tokens instead of arbitrary Tailwind arbitrary values.

## 1. Design Aesthetic: Rainbow Maniac (2026 Trend)
- **Vibrant Color Grading**: Embrace the Rainbow Maniac trend by utilizing vibrant gradients and multi-color layers while staying within HeroUI's design tokens.
- **Maximalist But Clean**: Apply rich, joyful micro-interactions and colorful focus/hover states without cluttering the screen or sacrificing accessibility (A11y).

## 2. Information Density & Layout Optimization (Anti-Waste)
- **Eliminate Redundancy**: Audit data presentation. Never repeat the same information across the screen (e.g., if a status is shown via an icon/color, do not add a duplicate text label next to it unless required for screen readers).
- **Compact Spacing (Data-Dense)**: Avoid generic, overly large margins and paddings (`p-6`, `gap-6`). Tighten spaces using HeroUI's smaller utility scales (`p-3`, `gap-2`, `min-h-0`) to ensure maximum visible content above the fold.
- **Visual Clutter Control**: Replace heavy borders and solid divider lines with subtle background shading (`bg-default-50`) or precise HeroUI shadow tokens to separate sections without eating up screen real estate.
- **Dynamic Collapse**: Use responsive/collapsible components (e.g., Accordion, Dropdown, Tabs, or scrollable horizontal carousels for mobile) to hide secondary data until requested by the user.

## 3. Internationalization (i18n) Rules for Features
- **Feature Isolation for Translations**: Each frontend feature module must manage its own translations inside a `features/<feature-name>/i18n/` directory with locale JSON files (e.g., `vi.json` and `en.json`).
- **Feature Registration**: Any new feature containing translation files must be registered in the `FEATURES` array in [getMessages.ts](file:///d:/GitHub/AI%20agent/agentx/apps/web/src/i18n/loaders/getMessages.ts) to enable automatic loading and merging.
- **Flat Keys Convention**: Translation JSON files must use flat dot-separated notation keys (e.g., `"login.title": "Đăng nhập"`), which are unflattened automatically at runtime. Avoid nested objects inside translation JSON files.
- **Hook Usage**: Always import and use `useTranslations` from `next-intl` to resolve localized strings in Client Components. Avoid hardcoded user-facing text in components.
- **Common Translations**: Put general, globally shared keys (such as app name, common action buttons, connection errors) in the global [common/](file:///d:/GitHub/AI%20agent/agentx/apps/web/src/i18n/common/) directory instead of repeating them in feature-specific directories.

