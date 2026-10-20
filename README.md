# Liverr API

Express and MongoDB API for the Liverr freelance marketplace. It handles accounts, gigs, orders and Stripe payments, image uploads, conversations, messages, and reviews.

## Requirements

- Node.js 20.19 or newer
- npm
- MongoDB Atlas (or another reachable MongoDB instance)
- Stripe account and Cloudinary account for payments and image uploads

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in the required values:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_KEY=<random-secret-at-least-32-characters>
PORT=8000
CLIENT_URL=http://localhost:5173
TRUST_PROXY=0
STRIPE_SECRET_KEY=sk_test_<your-secret-key>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

3. Install dependencies and start the API:

```bash
npm ci
npm run dev
```

The API is available at `http://localhost:8000`. Run tests with `npm test`.
Use `npm start` to run the API without Node's file watcher.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_KEY` | Yes | Secret used to sign authentication tokens; use 32+ random characters in production |
| `CLIENT_URL` | Yes in production | Allowed frontend origin(s), including `https://`, comma-separated, without trailing slashes or paths |
| `STRIPE_SECRET_KEY` | For payments | Private Stripe API key; never put this in the frontend |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary account name |
| `CLOUDINARY_API_KEY` | For uploads | Private Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Private Cloudinary secret |
| `PORT` | Local only | Local Express port; Vercel assigns the production port |
| `TRUST_PROXY` | Optional | Set to `1` on Vercel so request IPs work correctly behind its proxy |

## Deploy the backend to Vercel

1. Deploy the frontend once and note its Vercel origin (for example, `https://your-frontend.vercel.app`).
2. Import the backend GitHub repository as a new Vercel project. Set its **Root Directory** to the backend repository root.
3. Vercel detects the default Express app export in `app.js` and serves it as a serverless function. No custom start command, build command, or `vercel.json` is needed.
4. In **Project Settings → Environment Variables**, add `MONGO_URI`, `JWT_KEY`, `CLIENT_URL=https://liverr-client.vercel.app`, `TRUST_PROXY=1`, `NODE_ENV=production`, and the Stripe and Cloudinary values. Add secrets to Production and Preview only when those environments need them.
5. `https://liverr-client.vercel.app` is the frontend origin configured in this project. Set `CLIENT_URL` to this exact origin, including `https://`. Multiple allowed origins can be separated by commas. Do not include a trailing slash, path, or `/api`.
6. Deploy and note the backend URL. Its API routes keep the `/api` prefix; `/health` checks MongoDB and `/live` checks function liveness.

The MongoDB connection is opened when a database-backed request arrives and reused while the serverless instance remains warm. MongoDB Atlas must allow connections from Vercel. Vercel function IPs can change; use Vercel Static IPs if available, or allow network access from `0.0.0.0/0` with a strong database password and a least-privilege database user.

The frontend and backend use credentialed CORS and HTTP-only auth cookies. For reliable browser cookie behavior, use custom frontend and backend domains on the same registrable domain (for example, `www.example.com` and `api.example.com`) and list the frontend origin in `CLIENT_URL`. Browsers may block cookies between unrelated `*.vercel.app` domains.

Vercel function requests have a limited body size. Image uploads are limited to 4 MB to leave room for multipart request overhead.
