# 🛒 AI Deal Finder

**Search once, compare prices across Indian shopping sites in one place.**

AI Deal Finder is a Next.js web app that takes a product name (for example "iPhone 15" or "Nike Air Jordan 4") and shows a side-by-side price comparison from platforms like Amazon.in, Flipkart, Meesho, Croma and Reliance Digital. Each result has a button that opens the seller's own page.

---

## ✨ Features

- 🔍 **One search, many platforms**: compare prices from several sellers on a single results page
- 🏆 **Best price highlight**: sellers are sorted by price, and the cheapest one gets a "Best Price" badge
- 💰 **Savings summary**: lowest price, max savings, top rating and platform count at a glance
- 🔗 **Direct seller links**: "View on Amazon / Flipkart / ..." opens the seller's website
- 📧 **Email report**: send the comparison to your inbox
- 🌗 **Light and dark mode** with a theme toggle
- 📱 **Responsive UI** for desktop and mobile
- 🧪 **Demo mode**: if no API key is set, the app falls back to demo data and shows a "Demo prices" notice

---

## 🧰 Tech Stack

| Area | Tools |
|---|---|
| Framework | Next.js 15 (App Router), React |
| Styling | Tailwind CSS, reusable UI components (`components/ui`) |
| Icons | lucide-react |
| Price data | [SerpApi](https://serpapi.com) (Google Shopping, Amazon Search, Google Product) |
| Language | JavaScript (JSX) |

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org) 18 or newer
- A free [SerpApi](https://serpapi.com) account (the free plan includes 250 searches per month)

### 2. Clone and install

```bash
git clone https://github.com/Affan-khan-oss/Ai-Deal-Finder.git
cd Ai-Deal-Finder
npm install
```

### 3. Set up environment variables

Copy the example file:

```bash
# Windows
copy .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

Open `.env.local` and add your keys:

```env
# Required for live prices (https://serpapi.com/users/sign_up)
SERPAPI_KEY=your_serpapi_key_here

# Optional: Flipkart affiliate API
FLIPKART_AFFILIATE_ID=
FLIPKART_TOKEN=

# Optional: your Amazon Associates tag (earns commission on links)
AMAZON_TAG=
```

> ⚠️ Never commit `.env.local`. It is already listed in `.gitignore`. Keep your API keys private.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Restart the dev server after changing `.env.local`.

---

## 🧠 How It Works

1. The user types a product and clicks **Compare Prices**.
2. The search form calls the app's own API route (`/api/search`).
3. The server calls SerpApi with the secret key (the key never reaches the browser).
4. Results are filtered to the supported sellers, matched to the searched product, and grouped.
5. Prices are sorted from low to high, the cheapest seller is marked, and savings are calculated.
6. The results page renders the product card, stats and one row per seller with a link to the seller's page.

---

## 📁 Project Structure

```
ai-deal-finder/
├── app/
│   ├── api/
│   │   ├── search/        # Price search route (calls SerpApi)
│   │   ├── send-email/    # Email report route
│   │   └── test/          # Test route
│   ├── layout.jsx
│   ├── loading.jsx
│   ├── page.jsx
│   └── globals.css
├── components/
│   ├── ui/                # Button, Card, Badge, Input, Select, ...
│   ├── search-form.jsx
│   ├── progress-section.jsx
│   ├── results-section.jsx
│   └── theme-provider.jsx
├── hooks/                 # use-toast, use-mobile
├── lib/                   # Platform config and helpers
├── public/                # Static assets
├── .env.example           # Environment variable template
└── package.json
```

---

## ⚠️ Good to Know

- **Each search uses SerpApi credits.** Only search when needed, and use caching to save your monthly limit.
- **Not every seller appears for every product.** If a seller is missing from Google Shopping data, it will not show up.
- **Prices may differ slightly** from the live seller page, because they come from search data.
- **Variants can differ** (size, colour, storage). The more specific your search, the better the match.
- Meesho, Croma and Reliance Digital have no public price API, so they are covered through SerpApi only.

---

## 🗺️ Roadmap

- [ ] Add more sellers (Myntra, Ajio, Nykaa, Tata CLiQ)
- [ ] Price history and price drop alerts
- [ ] Save favourite products
- [ ] Better variant matching across platforms
- [ ] Deploy to Vercel

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is open for learning and personal use. Add a license file (for example MIT) if you want others to reuse it.

---

## 👤 Author

**Affan Khan**
GitHub: [@Affan-khan-oss](https://github.com/Affan-khan-oss)

---

> This project is not affiliated with Amazon, Flipkart, Meesho, Croma, Reliance Digital or SerpApi. All product names and logos belong to their respective owners.
