
<div align="center">
  <img src="icons/web-app-manifest-512x512.png" alt="Spotter Logo" width="128" height="128">
  <h1>Spotter</h1>
  <p><strong>Votre assistant de surlignage intelligent pour le web.</strong></p>
</div>

---

**Spotter** est une extension Chrome puissante et discrète conçue pour vous aider à repérer instantanément les informations importantes sur n'importe quelle page web. Que vous cherchiez des "Green Flags" dans une offre d'emploi, des termes techniques spécifiques, ou que vous vouliez éviter certains contenus, Spotter les met en lumière pour vous.

## ✨ Fonctionnalités Clés

*   **🔍 Surlignage Automatique :** Définissez vos listes de mots-clés et Spotter les surligne automatiquement dès qu'ils apparaissent sur une page.
*   **🎨 Listes Personnalisables :** Créez autant de listes que vous le souhaitez (ex: "Compétences", "À éviter", "Urgent"). Assignez une couleur unique à chaque liste parmi une palette de 24 couleurs vibrantes.
*   **🖱️ Bouton Flottant (FAB) :** Un bouton discret et élégant s'intègre à votre navigation pour un accès rapide aux contrôles sans avoir à chercher l'icône de l'extension.
*   **⚡ Menu Contextuel Rapide :** Sélectionnez n'importe quel texte, faites un clic droit et ajoutez-le instantanément à l'une de vos listes existantes.
*   **🔄 Support SPA & Dynamique :** Fonctionne parfaitement sur les sites modernes (Gmail, LinkedIn, Facebook) en détectant les changements de contenu sans recharger la page.
*   **🧠 Matching Intelligent :**
    *   **Insensible à la casse et aux accents :** "café", "CAFE", et "Cafe" sont tous détectés.
    *   **Limites de mots strictes :** "Go" est surligné dans "Go/JS", mais pas dans "MongoDb".
    *   **Variations (Optionnel) :** Peut détecter automatiquement les pluriels simples.
*   **⌨️ Raccourcis Clavier :** Activez ou désactivez le surlignage en une fraction de seconde (Défaut: `Ctrl+Shift+H` ou `Cmd+Shift+H`).

## 🚀 Installation

1.  Clonez ce dépôt ou téléchargez les fichiers.
2.  Ouvrez Chrome et allez sur `chrome://extensions/`.
3.  Activez le **Mode développeur** (en haut à droite).
4.  Cliquez sur **Charger l'extension non empaquetée**.
5.  Sélectionnez le dossier contenant les fichiers de Spotter.

## 📖 Utilisation

1.  **Créer une liste :** Cliquez sur l'extension ou le bouton flottant, puis sur "Éditer les listes" (ou le crayon) pour créer votre première liste (ex: "Mots positifs", couleur verte).
2.  **Naviguer :** Allez sur n'importe quel site web. Les mots de votre liste apparaîtront surlignés.
3.  **Ajouter à la volée :** Sélectionnez un mot intéressant sur une page -> Clic Droit -> "Ajouter à Spotter" -> Choisissez votre liste.
4.  **Contrôle total :** Utilisez le switch dans le menu pour activer/désactiver une liste spécifique ou l'extension entière.

## 🛠️ Technologies

*   **Manifest V3 :** Conforme aux dernières normes de sécurité et de performance de Chrome.
*   **Shadow DOM :** L'interface (bouton flottant) est isolée du style de la page visitée pour éviter tout conflit visuel.
*   **MutationObserver :** Pour une réactivité parfaite sur les applications web dynamiques.
*   **TreeWalker API :** Pour un traitement du texte efficace et performant sans perturber le DOM.

## 📝 License

Distribué sous licence MIT. Voir `LICENSE` pour plus d'informations.
