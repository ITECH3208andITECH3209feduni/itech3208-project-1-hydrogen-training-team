[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/JCT9HXj3)

Project Brief: Hydrogen is a critical energy carrier as the world prepares to transition to sustainable green energy systems. However, hydrogen is very different from the traditionally used fuels (diesel, petrol) and power systems where electrons are the energy carriers. This necessitates tools to educate and increased general awareness to ensure public safety both for users and non-users.  

The project focusses on the development of virtual solutions for delivering hydrogen safety training to science and engineering undergraduate and postgraduate students.  

The as-developed tool should be able to educate a non-expert about:
i. Identifying risks linked to having hydrogen in a closed space or work environment,  
ii. Critical or key aspects to look for when ensuring safety of self and co-workers/others, and  
iii. Action-steps to ensure safety upon identification of a risk. 

The tools, preferably interactive, would mimic simulated laboratory and/or industry environment. The tools should be designed to also be suitable for non-science industry employees looking to upgrade-skills or for increasing awareness and safe-behaviour in hydrogen-spaces.  

The purpose of the tool is to take a non-expert/beginner to an intermediate stage to ensure readiness to work/navigate safely in a real hydrogen-related workspace by increasing hydrogen awareness. 

Client: 
A/Prof Surbhi Sharma (surbhi.sharma@federation.edu.au) 

Project Supervisors:   
A/Prof Surbhi Sharma (surbhi.sharma@federation.edu.au)  
Prof Bhavna Antony 

------------------------------------------------------

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
