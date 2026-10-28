# Accountability

A personal accountability app: create goals and track daily progress.
Built with React (Vite), React Router, Firebase Authentication and Cloud Firestore. No custom backend.

## Requirements

- Node 22 (`nvm use` reads `.nvmrc`)
- A Firebase project with Email/Password auth and Firestore enabled
- Java 21 or newer, only for running the rules tests (Firestore emulator)

## Setup

```bash
nvm use
npm install
cp .env.example .env.local   # then fill in your Firebase web app config
npm run dev
```

Open http://localhost:5173.

## Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start the dev server                                      |
| `npm run build`      | Build for production into `dist/`                         |
| `npm run preview`    | Serve the production build locally                        |
| `npm run lint`       | Lint with oxlint                                          |
| `npm run test:rules` | Test `firestore.rules` against the local emulator         |
| `npm run deploy`     | Build, then deploy the site and the Firestore rules       |

## Testing the security rules

The tests in `tests/` run against the Firestore emulator, never the real database.
The Firebase CLI needs Java 21+ on your `PATH`. On macOS:

```bash
export PATH="$(/usr/libexec/java_home -v 21+)/bin:$PATH"
npm run test:rules
```

## Deploying

```bash
npx firebase login      # once per machine
npm run deploy
```

This publishes the app to `https://<project-id>.web.app` and deploys `firestore.rules`,
so the rules in the console always match this repository.

## Data model

```
users/{uid}                                   name, email, createdAt
users/{uid}/goals/{goalId}                    title, description, category, frequency,
                                              startDate, endDate, status, createdAt, updatedAt
users/{uid}/goals/{goalId}/progress/{date}    date, completedAt   (date = 'YYYY-MM-DD')
```

## Project structure

```
src/
  components/  reusable UI pieces
  pages/       one component per route
  services/    Firebase Auth and Firestore calls
  context/     auth state shared across the app
  hooks/       reusable React hooks
  firebase/    Firebase initialization
  routes/      protected route handling
  utils/       small helper functions
tests/         Firestore Security Rules tests
```
