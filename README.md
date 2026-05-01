# Tree of Life

Minimal, responsive tree editor with Google sign-in, guest mode, and a D3 collapsible tree inspired by Mike Bostock's Observable reference.

## Stack

- React + TypeScript + Vite
- D3 for SVG tree layout, joins, and transitions
- Zustand for app state
- Firebase Auth + Firestore for signed-in persistence
- IndexedDB for guest persistence

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Populate `.env` with a Firebase web app config if you want Google login and cloud sync. Guest mode works without Firebase config.

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Firebase

Expected Firestore path:

```txt
users/{uid}/trees/{treeId}
```

Recommended security rule shape:

```txt
match /users/{uid}/trees/{treeId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

## Interaction

- Click a node to expand or collapse its subtree.
- Right-click on desktop, or long press on mobile, to open node actions.
- Use "View as root" to focus a subtree.
- Use "Back to Tree of Life" to return to the original root.
