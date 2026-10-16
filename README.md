# SmartB2B Prototype

SmartB2B is an HTML/CSS/JavaScript website with a Node.js and Express API. SQLite stores the marketplace records and form submissions locally.

## Pages

- `index.html` is the home page.
- `marketplace.html` is the supplier marketplace demo.
- `agreements.html` is the agreement management demo.
- `coming-soon.html` explains navigation destinations not included in the supplied prototype.
- `requirement.html` opens the home page.

## Run Locally

Install Node.js 18 or newer, then run:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. The database is created at `data/smartb2b.sqlite` on first start and seeded with sample products and agreements. The Google Fonts stylesheet is optional and requires an internet connection; system sans-serif fallbacks are configured.

## Files

- `css/globals.css` contains shared layout and component styles.
- `css/landing.css`, `css/marketplace.css`, and `css/agreements.css` contain page-specific styles.
- `js/main.js`, `js/landing.js`, `js/marketplace.js`, and `js/agreements.js` contain browser interactions.
- `server/app.js` defines the API and static-page routes.
- `server/database.js` creates the SQLite schema and initial demo data.
- `server/index.js` starts the HTTP server.
- `test/api.test.js` contains the API tests.

## API

- `GET /api/health`
- `GET /api/products`
- `GET /api/agreements`
- `POST /api/agreements`
- `POST /api/quotes`
- `POST /api/rfqs`

Run `npm test` to exercise the API. All records are sample/demo data. Authentication, payments, and supplier notifications are not implemented, so this backend is for local development and is not production-ready.
