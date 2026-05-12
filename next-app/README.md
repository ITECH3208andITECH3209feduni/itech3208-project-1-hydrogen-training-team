# Hydrogen Lab Safety – Next.js

Translated from vanilla HTML/CSS/JS to a **Next.js 14 App Router** application with TypeScript.

## Project Structure

```
hydrogen-lab/
├── app/
│   ├── globals.css      # Translated from styles.css
│   ├── layout.tsx       # Root layout (replaces <head> in index.html)
│   └── page.tsx         # Main page (replaces index.html body)
├── components/
│   ├── LabImage.tsx     # Lab image + hotspot buttons
│   └── HazardPopup.tsx  # Modal popup (replaces the #popup div + JS)
├── lib/
│   └── hazards.ts       # Hazard data + hotspot config (replaces switch in script.js)
├── public/
│   └── lab.jpg          # ← Place your lab image here
├── next.config.js
├── tsconfig.json
└── package.json
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Add your lab image**
   Copy `lab.jpg` into the `public/` folder. If your image is a different size, update the `width` and `height` props on the `<Image>` component in `components/LabImage.tsx`.

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## What Changed from Vanilla JS

| Original                        | Next.js equivalent                        |
|---------------------------------|-------------------------------------------|
| `index.html` body               | `app/page.tsx` (React component)          |
| `styles.css`                    | `app/globals.css` (unchanged CSS)         |
| `script.js` `showInfo()`        | `useState` in `page.tsx`                  |
| `script.js` `closePopup()`      | `setActiveHazard(null)` in `page.tsx`     |
| `window.onclick` backdrop close | `onClick` on overlay div in `HazardPopup` |
| `switch(type)` data             | `hazardData` object in `lib/hazards.ts`   |
| Hardcoded hotspot `div`s        | `hotspots` array mapped in `LabImage.tsx` |
| `<img>` tag                     | `next/image` `<Image>` component          |

## Customising Hotspot Positions

Edit the `hotspots` array in `lib/hazards.ts` to move hotspots, and add new entries to `hazardData` for additional hazard types.
