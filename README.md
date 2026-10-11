# Couple Budget & Rent Affordability

A single-file React app (`src/CoupleBudget.jsx`) for an unmarried couple renting together, built on a "Yours, Mine & Ours" model.

- **Affordability & Dashboard**: rent slider, 40x landlord test, housing-burden gauge, split comparison, commission impact, and a $2,800–$3,000 stress test
- **Income & Split Config**: gross/deduction inputs, commission and bonus toggles, proportional vs 50/50 split
- **Shared Budget**: linked 50/30/20 sliders and an editable joint-account line-item table
- **Personal**: each partner's own budget, cash-flow breakdown, and unallocated buffer

Inputs are saved in `localStorage`.

```bash
npm install
npm run dev
```

To drop the component into an existing project, copy `src/CoupleBudget.jsx`. It needs React 18+, Tailwind CSS, and `lucide-react`.
