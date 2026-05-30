# 🚀 Déploiement SDC Manager sur Vercel

## Variables d'environnement à configurer sur Vercel

```
NEXT_PUBLIC_SUPABASE_URL=https://fcbilnbojaqjjfqbyoqi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYmlsbmJvamFxampmcWJ5b3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTUzMjIsImV4cCI6MjA5NTYzMTMyMn0.NA8siWdNKKhsH9p8mA4gagVVyUiq3LyyO-nUyoDt4U8
```

## Option 1 — Via GitHub (recommandé)

1. Créer un repo GitHub : https://github.com/new
   - Nom : `sdc-manager`
   - Privé ou public au choix

2. Push le code :
```bash
git remote add origin https://github.com/TON_USERNAME/sdc-manager.git
git branch -M main
git push -u origin main
```

3. Aller sur https://vercel.com/new
4. Importer le repo GitHub `sdc-manager`
5. Framework : **Next.js** (détecté automatiquement)
6. Ajouter les variables d'environnement ci-dessus
7. Cliquer **Deploy** ✅

## Option 2 — Via Vercel CLI

```bash
npm install -g vercel
cd sdc-manager
vercel login
vercel --prod
```
Ajouter les variables d'env quand demandé.

## Supabase Dashboard
https://supabase.com/dashboard/project/fcbilnbojaqjjfqbyoqi

