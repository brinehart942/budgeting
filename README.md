# Couple Budget & Rent Affordability

A single-file React app (`src/CoupleBudget.jsx`) for an unmarried couple renting together, built on a "Yours, Mine & Ours" model.

- **Affordability & Dashboard**: rent slider, 40x landlord test, housing-burden gauge, split comparison, commission impact, and a $2,800–$3,000 stress test
- **Income & Split Config**: gross/deduction inputs, commission and bonus toggles, proportional vs 50/50 split
- **Shared Budget**: linked 50/30/20 sliders and an editable joint-account line-item table
- **Personal**: each partner's own budget, cash-flow breakdown, and unallocated buffer

Inputs auto-save in the browser (`localStorage`). The **Save & Export** button in the header adds:

- **Saved scenarios**: named snapshots (one per apartment, say), compared side by side by rent, burden and surplus
- **Backup (.json)**: export everything, including scenarios, and import it on another browser or device
- **Spreadsheet (.csv)**: line items, transfers, summary and 50/30/20 for Excel or Google Sheets
- **Print / PDF**: a light-themed report that opens the print dialog
- **Share link**: the whole budget is encoded in the link's `#` fragment, which browsers never send to a server; opening it asks before replacing local data

```bash
npm install
npm run dev
```

To drop the component into an existing project, copy `src/CoupleBudget.jsx`. It needs React 18+, Tailwind CSS, and `lucide-react`.
