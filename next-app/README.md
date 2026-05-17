# Hydrogen Lab Safety – Next.js

A **Next.js 14 App Router** application with TypeScript for hydrogen technology training. Features an interactive lab safety simulation and a dashboard tracking modules, scenarios, and quizzes.

## Project Structure

```
hydrogen-lab/
├── app/
│   ├── globals.css        # Shared styles for all pages
│   ├── layout.tsx         # Root layout — renders Navbar and wraps all pages
│   ├── page.tsx           # Dashboard (primary page)
│   ├── template/
│   │   └── page.tsx       # Template page to create new pages (Not part of navigation)
│   ├── lab/
│   │   └── page.tsx       # Interactive hydrogen lab (secondary page)
│   ├── modules/
│   └── quizzes/
├── components/
│   ├── Navbar.tsx         # Reusable navigation bar
│   ├── LabImage.tsx       # Lab image + hotspot buttons
│   └── HazardPopup.tsx    # Modal popup for hazard info
├── lib/
│   └── hazards.ts         # Hazard data + hotspot positions
├── public/
│   └── lab.jpg            # Lab image
├── next.config.js
├── tsconfig.json
└── package.json
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Pages

| Route  | File                  | Description                                                       |
|--------|-----------------------|-------------------------------------------------------------------|
| `/`    | `app/page.tsx`        | Dashboard with modules, scenarios, quizzes, and training progress |
| `/lab` | `app/lab/page.tsx`    | Interactive lab with clickable hazard hotspots                    |

## Adding a New Page

1. Create a new folder under `app/` named after the route (e.g. `app/modules/`)
2. Copy `template/page.tsx` into it
3. Update the `active` class on the correct nav link in `Navbar.tsx`
4. Replace the placeholder content with your page content

## Customising Hotspot Positions

Edit the `hotspots` array in `lib/hazards.ts` to move hotspots. Add new entries to both `hotspots` and `hazardData` for additional hazard types, making sure the new key is also added to the `HazardType` union at the top of the file.

## Customising the Dashboard

Training progress, module statuses, stat card counts, and certificate details are currently hardcoded in `app/page.tsx`. Replace these with data fetched from an API or database to make the dashboard dynamic.

## Fonts

The app uses **Exo 2** and **Inter** from Google Fonts, imported in `layout.tsx`. To self-host the fonts instead (recommended for performance), replace the `<link>` tag with `next/font/google`:

```tsx
import { Exo_2, Inter } from 'next/font/google';
```

See the [Next.js font documentation](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for setup details.
