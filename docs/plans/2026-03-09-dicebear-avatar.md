# DiceBear Avatar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer les initiales par défaut avec des avatars DiceBear (style avataaars) dans la Navbar et la page Profile.

**Architecture:** URL directe vers l'API REST DiceBear publique — `https://api.dicebear.com/9.x/avataaars/svg?seed=<userId>`. Un composant `Avatar` réutilisable est créé, puis intégré dans `Navbar` et `Profile`. L'`user.id` (UUID stable provenant du JWT `sub`) sert de seed.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4, DiceBear API (aucune lib supplémentaire)

---

### Task 1 : Composant `Avatar`

**Files:**
- Create: `frontend/src/components/ui/Avatar.tsx`

**Step 1 : Écrire le composant**

```tsx
interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, size = 40, className = "" }: AvatarProps) {
  const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const initials = seed.slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-card) ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt="avatar"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "flex");
        }}
      />
      <span
        className="absolute inset-0 hidden items-center justify-center text-xs font-semibold text-(--color-foreground)"
        aria-hidden="true"
      >
        {initials}
      </span>
    </div>
  );
}
```

**Step 2 : Vérifier la compilation**

```bash
cd frontend && npm run build
```
Expected : build propre, zéro erreur TypeScript.

**Step 3 : Commit**

```bash
git add frontend/src/components/ui/Avatar.tsx
git commit -m "feat: add reusable Avatar component using DiceBear API"
```

---

### Task 2 : Intégration dans `Navbar`

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`

**Contexte :**
Actuellement, `Navbar.tsx` affiche `<UserButton size="icon" className="bg-(--color-accent)" />` quand l'utilisateur est connecté. On le remplace par `<Avatar>` wrappé dans un `<Link to="/account">`.

Le `user` vient de `useAuth()` — déjà importé.

**Step 1 : Modifier `Navbar.tsx`**

1. Ajouter l'import : `import { Avatar } from "../ui/Avatar";`
2. Supprimer l'import `UserButton` de `@neondatabase/neon-js/auth/react`
3. Remplacer :
```tsx
<UserButton size="icon" className="bg-(--color-accent)" />
```
par :
```tsx
<Link to="/account">
  <Avatar seed={user.id} size={36} />
</Link>
```

**Step 2 : Vérifier la compilation**

```bash
cd frontend && npm run build
```
Expected : build propre.

**Step 3 : Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "feat: replace UserButton with DiceBear avatar in Navbar"
```

---

### Task 3 : Intégration dans `Profile`

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

**Contexte :**
La page `Profile.tsx` affiche directement un `<h1>` "Your Training Plan". On ajoute un bloc en-tête au-dessus avec l'avatar (taille 80) et l'email de l'utilisateur.

Le `user` est déjà disponible via `useAuth()`.

**Step 1 : Modifier `Profile.tsx`**

1. Ajouter l'import : `import { Avatar } from "../components/ui/Avatar";`
2. Dans le JSX, avant le `<div className="mb-8">` contenant le `<h1>`, insérer :

```tsx
<div className="flex items-center gap-4 mb-10">
  <Avatar seed={user.id} size={80} />
  <div>
    <p className="text-lg font-semibold text-(--color-foreground)">{user.email}</p>
    <p className="text-sm text-(--color-muted)">Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
  </div>
</div>
```

**Step 2 : Vérifier la compilation**

```bash
cd frontend && npm run build
```
Expected : build propre.

**Step 3 : Commit**

```bash
git add frontend/src/pages/Profile.tsx
git commit -m "feat: add DiceBear avatar header to Profile page"
```
