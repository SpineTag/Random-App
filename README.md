# Grand Strategy Country Sim (MVP)

A lightweight, turn-based grand strategy country management simulation you can run in the browser.

## Run

```bash
npm install
npm run dev
```

Then open the printed local URL.

## How to play

- Click **New game**
- Take **one action** (some actions require picking a **target country**)
- Click **End turn**
- Use **Load save** to continue later (auto-saves after actions/turns)

## What’s implemented

- Economy: GDP growth, treasury income, maintenance, debt + interest
- Domestic: stability, legitimacy, war exhaustion, tax rate, conscription
- Military: army/navy sizes, attrition from wars
- Diplomacy: relation scores, rivalry, alliances, targeted actions
- Wars: intensity, battles, exhaustion pressure and negotiated ends
- Events: positive/negative random events based on risk

