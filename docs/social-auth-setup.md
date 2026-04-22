# Social Auth Setup

This project uses a server-side OAuth flow:

- Frontend starts auth by redirecting the browser to the backend.
- Backend redirects to Google or Apple.
- Provider redirects back to the backend callback.
- Backend creates the app session and redirects the browser to the frontend callback page.

Because of that, the provider callback URLs must point to the Go backend, not the Next.js frontend.

## Local URLs this repo expects

Frontend:

- `http://localhost:3000`

Backend:

- `http://localhost:8080`

OAuth callbacks:

- Google: `http://localhost:8080/api/v1/auth/social/google/callback`
- Apple: `https://YOUR_PUBLIC_HTTPS_BACKEND/api/v1/auth/social/apple/callback`

Apple requires a public `https://` callback URL with a real domain name. It does not accept `localhost` or an IP address for the web redirect URI.

## Backend env

Set these in `/Users/fayezbast/uber/delivery-backend/.env`:

```dotenv
FRONTEND_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/v1/auth/social/google/callback

APPLE_CLIENT_ID=your-services-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_REDIRECT_URL=https://YOUR_PUBLIC_HTTPS_BACKEND/api/v1/auth/social/apple/callback
```

`APPLE_CLIENT_ID` must be the Apple Services ID used for web sign-in, not your iOS app bundle ID.

## Google setup

1. Open the Google Auth Platform / Credentials page.
2. Create or choose a project.
3. If prompted, configure the app branding / consent screen first.
4. Create an OAuth client of type `Web application`.
5. Add this authorized redirect URI:

   `http://localhost:8080/api/v1/auth/social/google/callback`

6. Copy the generated client ID and client secret into the backend `.env`.

This flow is server-side. You do not need a frontend callback URL in Google.

## Apple setup

You need:

- an Apple Developer account
- a primary App ID with Sign in with Apple enabled
- a Services ID for the website flow
- a Sign in with Apple private key
- a public HTTPS backend URL for the Apple callback

### Apple values to create

Services ID:

- Use this as `APPLE_CLIENT_ID`

Key:

- Enable `Sign in with Apple`
- Use the key's ID as `APPLE_KEY_ID`
- Download the `.p8` file once
- Put its contents into `APPLE_PRIVATE_KEY`

Team ID:

- Use this as `APPLE_TEAM_ID`

Return URL:

- `https://YOUR_PUBLIC_HTTPS_BACKEND/api/v1/auth/social/apple/callback`

Domain:

- the domain part of `YOUR_PUBLIC_HTTPS_BACKEND`

### Apple console steps

1. In Apple Developer, create or select a primary App ID with Sign in with Apple enabled.
2. Create a `Services ID`.
3. Open that Services ID and configure Sign in with Apple for the web.
4. Set:

   - Domain: your public backend domain
   - Return URL: `https://YOUR_PUBLIC_HTTPS_BACKEND/api/v1/auth/social/apple/callback`

5. Create a Sign in with Apple key and download the `.p8` file.
6. Put the Services ID, Team ID, Key ID, private key, and return URL into the backend `.env`.

## Public HTTPS for Apple

For local development, Google can use `localhost`, but Apple cannot.

You need your backend reachable at a public HTTPS URL. Typical approaches:

- temporary tunnel to `localhost:8080`
- staging backend with HTTPS

Whatever URL you use must exactly match `APPLE_REDIRECT_URL` and the Return URL configured in Apple Developer.

## Smoke test

1. Start the backend on port `8080`.
2. Start the frontend on port `3000`.
3. Open `/auth/sign-in`.
4. Click `Continue with Google` or `Continue with Apple`.
5. After successful auth, the app should redirect to `/auth/social/callback` and then into the signed-in area.

## Current app behavior

- Social auth creates or signs in a regular `customer` account.
- Driver and restaurant approval flows are separate and are not connected to Google or Apple sign-in.
