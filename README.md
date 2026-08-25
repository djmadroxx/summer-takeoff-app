# Summer Takeoff — Mobile Web App

A projekt a feltöltött Summer Takeoff mobil UI vizuális irányára épül: fekete felület, fehér tipográfia, neon sárga akcentus, lekerekített glassmorphism kártyák és finom mozgó fények.

## Jelenlegi funkciók

- Bejelentkezési képernyő
- E-mail + jelszó validáció
- Bejelentkezés állapotának mentése localStorage-ba
- Digitális belépő oldal egyedi QR-kóddal
- Aktív belépő státusz
- Tagazonosító másolása
- Kijelentkezés
- Mobil alsó navigáció
- Reszponzív, mobil-first layout
- Finom háttér-, glow- és QR-scan animációk

> A jelenlegi auth szándékosan frontend demo: nincs backend és nincs valódi jelszóellenőrzés. Éles használathoz a `src/lib/auth.ts` helyére valódi auth API/Firebase/Supabase stb. köthető.

## Indítás VS Code-ban

```bash
npm install
npm run dev
```

Majd nyisd meg a Vite által kiírt helyi címet.

## Production build ellenőrzése

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Következő bővítés

A struktúra már külön komponensekre és oldalakra van bontva, ezért később tisztán hozzáadható az események, jegyek, shop, profil, push értesítések és valódi backend.
