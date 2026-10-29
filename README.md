# Accountability

Set goals, check them off each day, and keep each other on track in groups.

**Live app:** https://accountability2910.vercel.app

Built with React 19 (Vite), React Router, Firebase Authentication and Cloud Firestore.
There is no custom backend: the browser talks to Firestore directly, and
[`firestore.rules`](firestore.rules) decides who may read and write what.

## Features

**Personal goals**
- Daily or weekly goals with a category, start date and optional end date
- Mark a goal active or completed; edit or delete it at any time

**Dashboard**
- **Today**: everything due today, your own goals and your groups' goals, with one tap to check off
- **Week**: a Monday–Sunday grid per goal, showing done, missed and open days
- **Month**: a calendar heatmap from yellow (little done) to green (all done), a score per goal,
  and your current and best streak of days where every daily goal was done
- Step back through past weeks and months

**Groups**
- Create a group and share its code; others join with the code
- Add shared goals; the group's start and end dates apply to all of them
- Each member checks in on their own goals and can leave a note; the owner can fill in anyone's day
- Week and Month tabs compare every member's progress side by side

**Also**
- Works on phones and desktop
- Shows a banner when you're offline, since changes can't be saved without a connection

## Tech stack

| Area      | Choice                                              |
| --------- | --------------------------------------------------- |
| UI        | React 19, React Router 7, plain CSS (no UI library) |
| Build     | Vite                                                |
| Auth      | Firebase Authentication (email and password)        |
| Database  | Cloud Firestore, secured by `firestore.rules`       |
| Hosting   | Vercel                                              |
| Tests     | Node's built-in test runner, Firestore emulator     |
| Lint      | oxlint                                              |

## Getting started

### Requirements

- Node 22 (`nvm use` reads `.nvmrc`)
- A Firebase project with **Email/Password** sign-in and **Firestore** enabled
- Java 21 or newer, only for the security rules tests (they run on the Firestore emulator)

### Run it locally

```bash
git clone https://github.com/Neha-Niharika/Accountability.git
cd Accountability
nvm use
npm install
cp .env.example .env.local   # then fill in your Firebase web app config
npm run dev
```

Open http://localhost:5173.

The values for `.env.local` come from Firebase console → Project settings → Your apps →
Web app. See [`.env.example`](.env.example) for the variable names. `.env.local` is
ignored by git.

Deploy the security rules to your Firebase project once, or the app can't read or write anything:

```bash
npx firebase login
npx firebase deploy --only firestore:rules
```

## Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start the dev server                                      |
| `npm run build`      | Build for production into `dist/`                         |
| `npm run preview`    | Serve the production build locally                        |
| `npm run lint`       | Lint with oxlint                                          |
| `npm test`           | Unit tests for the week, month and streak statistics      |
| `npm run test:rules` | Test `firestore.rules` against the local emulator         |
| `npm run deploy`     | Build, then deploy to Firebase Hosting with the rules     |

## Testing

```bash
npm test             # fast, no setup needed
npm run test:rules   # needs Java 21+
```

The rules tests run against the Firestore emulator, never the real database.
If Java 21 isn't your default on macOS:

```bash
export PATH="$(/usr/libexec/java_home -v 21+)/bin:$PATH"
npm run test:rules
```

## Deployment

The live app is hosted on **Vercel**:

1. Import the GitHub repository in Vercel (framework preset: Vite).
2. Add the six `VITE_FIREBASE_*` variables from `.env.example` under Project settings → Environment variables.
3. In Firebase console → Authentication → Settings → Authorized domains, add your Vercel domain.

Vercel then builds and deploys on every push to `main`.

The site and the security rules deploy separately. After changing
`firestore.rules`, deploy them yourself:

```bash
npx firebase deploy --only firestore:rules
```

`npm run deploy` is an alternative that publishes the site to Firebase Hosting
(`https://<project-id>.web.app`) and deploys the rules in one go.

## Data model

```
users/{uid}                                   name, email, createdAt
users/{uid}/goals/{goalId}                    title, description, category, frequency,
                                              startDate, endDate, status, createdAt, updatedAt
users/{uid}/goals/{goalId}/progress/{date}    date, completedAt          (date = 'YYYY-MM-DD')
users/{uid}/groupMemberships/{groupId}        joinedAt                   (lists "my groups")

groups/{groupId}                              name, code, ownerId, ownerName,
                                              startDate, endDate, createdAt
groups/{groupId}/members/{uid}                name, role, code, joinedAt
groups/{groupId}/goals/{goalId}               title, description, frequency, createdAt, updatedAt
groups/{groupId}/checkins/{goalId}_{date}_{uid}
                                              goalId, uid, name, date, note, completedAt
groupCodes/{CODE}                             groupId                    (lets a code find its group)
```

Categories and other allowed values are listed in both
[`src/utils/constants.js`](src/utils/constants.js) and `firestore.rules`. Keep them in sync.

## Project structure

```
src/
  components/  reusable UI pieces (goal cards, week/month views, forms, icons)
  pages/       one component per route
  hooks/       data loading and shared React logic
  services/    all Firebase Auth and Firestore calls
  context/     auth state shared across the app
  firebase/    Firebase initialization
  routes/      protected route handling
  utils/       dates, stats, validation and other plain helpers
scripts/       one-off admin scripts (Firebase Admin SDK)
tests/         unit tests and Firestore security rules tests
```
