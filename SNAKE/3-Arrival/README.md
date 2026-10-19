# 3-Arrival — Snake (édition futuriste)

La tête du serpent suit la souris avec **Arrival** ; chaque anneau suit le précédent avec `arrive(cible, distance)`.

## Lancer

Servir le dossier (nécessaire pour `loadFont`) puis ouvrir `index.html` :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Commandes

| Entrée | Effet |
| --- | --- |
| Souris | la tête rejoint le curseur (Arrival) |
| Maintenir clic / `SHIFT` | **turbo** (barre d'énergie dans le HUD) |
| `P` | afficher / masquer le panneau de réglages |
| `M` | couper / rétablir le son |
| `D` | mode debug de `Vehicle` |
| Clic / `ESPACE` (game over) | recommencer |

## Panneau de réglages (`settings.js`, `settingsPanel.js`)

Toutes les valeurs sont définies dans `DEFINITIONS_REGLAGES` (bornes, pas, défaut) et normalisées par `normaliserReglage()`. Les changements s'appliquent en direct ; « Valeurs par défaut » réinitialise tout.

| Groupe | Réglage | Défaut | Plage |
| --- | --- | --- | --- |
| Serpent | Vitesse max de la tête | 5.5 | 1 – 12 |
| Serpent | Maniabilité (force max) | 0.28 | 0.05 – 1 |
| Serpent | Rayon de freinage (Arrival) | 130 | 20 – 300 |
| Serpent | Espacement des anneaux | 16 | 6 – 30 |
| Serpent | Taille | 26 | 12 – 44 |
| Serpent | Amplitude / fréquence d'ondulation | 6 / 0.22 | 0 – 20 / 0 – 0.6 |
| Serpent | Vitesse turbo | 10 | 5 – 20 |
| Partie | Anneaux au départ | 6 | 3 – 40 |
| Partie | Anneaux gagnés par proie | 3 | 1 – 8 |
| Partie | Nombre de proies | 5 | 1 – 15 |
| Game over | Rayon / poids de fuite de l'hologramme | 90 / 2.5 | 0 – 250 / 0 – 6 |
| Game over | Densité des points (`sampleFactor`) | 0.1 | 0.03 – 0.25 |
| Game over | Effet glitch | oui | — |
| Rendu | Couleur, rendu 3D, ombre portée, motif d'écailles | vert, oui, oui, oui | — |
| Rendu | Volume | 0.8 | 0 – 1 |

## Rendu 3D réaliste (`snake.js`)

Effet de relief dans le canvas 2D (le texte GAME OVER et le HUD restent intacts) : tube continu + sphères éclairées par une lumière en haut à gauche (`createRadialGradient`), reflet spéculaire, ombre portée, taches dorsales et écailles, tête de vipère (arcades, yeux ambrés à pupille verticale, narines, langue). L'ondulation est seulement visuelle (`positionsOndulees()`) : la physique du steering n'est pas modifiée. Décocher « Rendu 3D réaliste » revient au rendu néon d'origine.

## Mort et GAME OVER (text to points)

Le serpent meurt en se mordant (tête contre un anneau d'indice ≥ 6). Alors :

1. `TextParticle.pointsDuTexte(font, "GAME OVER", …)` calcule les points du texte avec `font.textToPoints()` (centré, `sampleFactor` 0.1, max 700 points).
2. `TextParticle.depuisSerpent(anneaux, points)` crée une particule par point, née sur un anneau du corps (répartition tête → queue) avec une impulsion d'explosion.
3. Chaque `TextParticle` (sous-classe de `Vehicle`, fichier `textParticle.js`) combine :
   - `arrive(cible)` hérité (zone de freinage `rayonZoneDeFreinage` = 140 px, `seuilArrivee` = 2 px) ;
   - `flee(souris)` surchargé, actif dans `perceptionFuite` = 90 px : l'hologramme fuit le curseur puis se reforme ;
   - somme pondérée (`poidsArrive` = 1, `poidsFuite` = 2.5) limitée à `budgetForce` = 2 × `maxForce`.
4. Son : `SoundFX.playDeath()` (impact + chute de fréquence + drone) puis `playGameOver(0.9)` (arpège descendant + accord) programmé sur l'horloge audio.

## Fonctionnalités futuristes

- Désintégration du serpent en hologramme « GAME OVER » qui fuit la souris.
- Glitch chromatique (copies cyan/magenta) à la mort puis aléatoirement.
- Onde de choc néon au point d'impact, grille Tron, HUD néon.
- Turbo à énergie (`Snake.setTurbo`) : `vitesseTurbo` 10, `forceTurbo` 0.6, consommation 0.012/image, recharge 0.004/image, réactivation après épuisement à 25 %.
- Sons générés (Web Audio, aucun fichier) via un gain maître : mute `M`, `stopAll()` au redémarrage.

## Tests

```bash
node --test tests/*.test.cjs
```

- `tests/snake.test.cjs` : serpent + turbo (énergie, limites, épuisement, recharge), ondulation visuelle sans mutation.
- `tests/settings.test.cjs` : définitions, bornes/pas, booléens, couleurs, immutabilité, `Snake.appliquerReglages`, espacement réel (vrai `Vehicle`), `redimensionner`.
- `tests/textParticle.test.cjs` : arrive/flee, seuils, composition et budget, convergence, retour après fuite, non-mutation, `depuisSerpent`, `pointsDuTexte` (police simulée).
- `tests/soundFX.test.cjs` : création différée, gain maître, sons, délai du jingle, mute, `setVolume`, `stopAll`, `dispose` (faux AudioContext).
- `tests/helpers/p5-adapter.cjs` : adaptateur minimal p5 pour charger `vehicle.js` + `textParticle.js` dans Node (ne remplace pas la validation navigateur).

`vehicle.js` n'est pas modifié.
