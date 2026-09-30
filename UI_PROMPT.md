Redesign and polish the UI of my Next.js (App Router) project "AI Deal Finder", a multi-platform price comparison tool (Amazon.in, Flipkart, Meesho, Croma, Reliance). Use the existing components in components/ui (button, card, badge, input, select) and Tailwind. Do not change the logic in lib/platforms.js or the data flow; only improve the UI. Files to work on: app/page.jsx, app/layout.jsx, components/search-form.jsx, components/results-section.jsx, components/progress-section.jsx.

DESIGN DIRECTION
- Modern, clean, trustworthy shopping-tool look (think Google Shopping meets Linear). Replace the heavy purple-to-pink gradient background with a soft neutral background (light: slate-50, dark: slate-950) and use ONE accent color (indigo) for actions.
- Add light/dark mode support using the existing theme-provider, with a toggle in the header.
- Font: Inter or Geist via next/font. Clear hierarchy: large bold hero title, muted subtitle, readable body text (minimum 14px, no tiny text).
- Rounded-2xl cards, subtle borders, soft shadows, generous spacing.

HERO / SEARCH
- Sticky slim header with logo, app name, and theme toggle.
- Centered hero: big headline, one-line subtitle, and a large search bar with a search icon, category select, and a prominent "Compare Prices" button.
- Show platform logos/chips (Amazon, Flipkart, Meesho, Croma, Reliance) under the search bar as "Compares prices from".
- Add 4 quick-search suggestion chips (e.g. iPhone 15, Nike shoes, Boat earbuds, Samsung TV).

RESULTS PAGE
- Top summary row: 4 stat cards (Lowest price, Max savings, Top rating, Platforms) with icons, consistent colors, and bigger numbers.
- Product card: fix layout so the image is large and correct with a fallback placeholder and object-contain. Show title, rating badge, review count, best price, MRP struck through, and discount % badge.
- Platform comparison rows: platform logo/badge on the left, price + delivery + offers in the middle, "View on X" button on the right. Highlight the cheapest row with a green border and a "Best Price" badge. Sort rows by price ascending.
- Add a price-difference bar or "You save ₹X vs highest price" line.
- Make the "Demo prices" warning a small dismissible alert banner at the top, not inside the content.
- Email report section: cleaner card with an input and a "Send Report" button, plus a success toast using use-toast.

STATES AND POLISH
- Loading: skeleton cards and a step-by-step progress indicator (Searching Amazon, Flipkart, Meesho...).
- Empty and error states with an icon and a friendly message.
- Smooth hover/transition effects, focus rings, and accessible aria-labels.
- Fully responsive: on mobile, stack the platform rows as cards, use a full-width search bar, and keep buttons at least 44px tall.

RULES
- Keep it JSX (not TypeScript). Use lucide-react icons. No new heavy dependencies.
- After changes, run `npm run dev` and fix any errors.
- Summarize what you changed at the end.