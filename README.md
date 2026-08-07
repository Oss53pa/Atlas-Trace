# Atlas Trace

Contrôle d'accès et traçabilité matière sur site — application multitenant de la suite **Atlas Studio**.

Maquette interactive (statique, sans backend) couvrant l'intégralité du cahier des charges **ATS-TRACE-CDC-001** — les 20 modules M1 → M20.

## Stack

- Vite · React 18 · TypeScript · Tailwind CSS
- Polices : **Dosis** (interface Atlas Trace) · **Grand Hotel** (signature Atlas Studio)
- Aucune dépendance UI lourde (icônes : `lucide-react`)

## Démarrer

```bash
npm install
npm run dev
```

Application sur http://localhost:5173. Point d'entrée : la page d'accueil, qui liste et ouvre chaque module.

## Périmètre

| Lot | Modules |
|-----|---------|
| **1 — Accès & présence** | M1 Entreprises · M2 Donneurs d'ordre · M3 Badges · M4 Listes · M5 Poste · M6 Registres · M15 Tableau de bord |
| **2 — Matière** | M7 Parcs & marquage · M8 Entrées ponctuelles · M9 Sorties · M10 Contrôle sortie · M11 Véhicules · M12/M13 Livraisons · M14 Évacuations |
| **3 — Exploitation** | M16 Main courante · M17 Clés · M18 Administration, audit & mode dégradé |
| **Généralisation** | M19 Paramétrage & modèles sectoriels · M20 Back office éditeur |

## Structure

```
src/
  components/ui/   composants de base (Button, Card, Badge, StatCard, StatusBanner, Avatar, Logo)
  data/            données mock par module
  features/        un dossier par domaine / module
  App.tsx          navigation à onglets
```

Premier client pilote : New Heaven SA — chantier du centre commercial Cosmos Angré, Abidjan.
