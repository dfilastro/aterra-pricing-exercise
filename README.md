# AterraAI pricing exercise — scaffold

## Run it

```
npm install
npm run dev
```

Then open http://localhost:3000

Node 18 or later. Nothing else to configure.

## What's here

```
app/page.tsx              server component, loads the quote and renders the table
app/api/quote/route.ts    GET / PATCH / DELETE for the quote  (already written for you)
components/PricingTable   a plain, non-interactive rendering of the data
lib/types.ts              the data model
lib/seed.ts               the quotation data
lib/store.ts              server-side store  (already written for you)
```

## What the scaffold does and does not do

It renders the raw data. The derived columns — Cost + VAT, Client pays, GP, GP % — show
a dash, because nothing is calculated. Nothing is editable. There are no totals.

That is the exercise. See the brief.

## The save endpoint

Already written, so you don't spend time on boilerplate:

```
GET    /api/quote     returns the current quote
PATCH  /api/quote     body: { lineId, commPct?, mrkpPct?, nett? }  returns the updated quote
DELETE /api/quote     restores the seed data
```

PATCH has a deliberate 600ms delay. Saving is not instant in the real product.

The store is an in-memory object on the server. It works locally and on Vercel.
On Vercel it resets when the instance goes cold — that is expected and fine.

Replace any of this if you prefer something else.

## Deploying

Push to a GitHub repo, then import it at vercel.com. No environment variables,
no build configuration. The free tier is fine.
