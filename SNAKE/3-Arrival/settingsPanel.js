/**
 * settingsPanel.js — 3-Arrival
 *
 * Panneau HTML de réglages (p5 DOM) construit à partir de DEFINITIONS_REGLAGES.
 * Chaque contrôle a un libellé associé et réagit pendant le glissement (input).
 * onChange(cle, valeur) reçoit la valeur normalisée.
 */
function creerPanneauReglages(reglages, onChange, onReset) {
  const panneau = createDiv().addClass("panneau-reglages").id("panneau-reglages");
  panneau.attribute("role", "region");
  panneau.attribute("aria-label", "Réglages du jeu");
  createElement("h2", "⚙ Réglages <small>[P] masquer</small>").parent(panneau);

  const controles = {};
  let groupeCourant = null;
  let pointeurDessus = false;
  panneau.mouseOver(() => (pointeurDessus = true));
  panneau.mouseOut(() => (pointeurDessus = false));

  const format = (def, v) => (def.type === "nombre" ? String(v) : "");

  for (const def of DEFINITIONS_REGLAGES) {
    if (def.groupe !== groupeCourant) {
      groupeCourant = def.groupe;
      createElement("h3", def.groupe).parent(panneau);
    }
    const ligne = createDiv().addClass("ligne-reglage").parent(panneau);
    const id = `reglage-${def.cle}`;
    const label = createElement("label", def.libelle).parent(ligne);
    label.attribute("for", id);
    const valeurAffichee = createSpan(format(def, reglages[def.cle])).addClass("valeur").parent(ligne);

    let champ;
    if (def.type === "nombre") {
      champ = createSlider(def.min, def.max, reglages[def.cle], def.pas);
    } else if (def.type === "couleur") {
      champ = createColorPicker(reglages[def.cle]);
    } else {
      champ = createInput("", "checkbox");
      champ.elt.checked = reglages[def.cle];
    }
    champ.id(id).parent(ligne);

    const lire = () => (def.type === "booleen" ? champ.elt.checked : champ.value());
    champ.input(() => {
      const valeur = normaliserReglage(def.cle, lire());
      valeurAffichee.html(format(def, valeur));
      onChange(def.cle, valeur);
    });
    controles[def.cle] = { champ, valeurAffichee, def };
  }

  const bouton = createButton("Valeurs par défaut").parent(panneau);
  bouton.mousePressed(() => onReset());

  return {
    panneau,
    pointeurDessus: () => pointeurDessus,
    basculer() {
      const cache = panneau.hasClass("cache");
      if (cache) panneau.removeClass("cache");
      else panneau.addClass("cache");
      if (!cache) pointeurDessus = false;
    },
    synchroniser(valeurs) {
      for (const cle of Object.keys(controles)) {
        const { champ, valeurAffichee, def } = controles[cle];
        if (def.type === "booleen") champ.elt.checked = valeurs[cle];
        else champ.value(valeurs[cle]);
        valeurAffichee.html(format(def, valeurs[cle]));
      }
    },
  };
}

if (typeof window !== "undefined") {
  window.creerPanneauReglages = creerPanneauReglages;
}
