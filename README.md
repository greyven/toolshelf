# Toolshelf — Mes Outils Installés

*[English version below](#english)*

Un panneau pour Claude Code qui montre **tous tes outils au même endroit** : plugins, skills, connecteurs et programmes installés sur l'ordinateur. Il explique à quoi sert chacun, te **suggère le bon outil pendant que tu écris ta demande**, et permet d'activer ou de désactiver un outil d'un simple clic.

> **Version prototype.** Le panneau fonctionne et sert au quotidien, mais il reste beaucoup à améliorer. Toute personne qui a envie d'y contribuer est la bienvenue : voir [Un projet que j'espère communautaire](#un-projet-que-jespère-communautaire).

## Ce qu'il fait

- **Recense tes outils** tout seul, sans liste à tenir à jour : plugins, skills personnels, connecteurs (y compris ceux de claude.ai) et programmes du PC décrits dans `fiches/outils-pc.json`.
- **Une fiche par outil** : ce qu'il fait, son mode d'emploi, pourquoi et quand s'en servir, des exemples. Sept fiches sont livrées ; pour les autres outils, une fiche est rédigée automatiquement par un petit modèle (Haiku).
- **Suggestions pendant la frappe** : une bande au-dessus de la zone de saisie propose les outils utiles pour ce que tu es en train d'écrire, d'après leur nom et leurs mots-clés.
- **Surlignage** de l'outil en cours d'utilisation pendant que Claude travaille.
- **Cases à cocher** pour activer ou désactiver un plugin, un skill personnel ou un connecteur, sans rien supprimer.
- **Réglages** (⚙) : langue (français ou anglais), couleurs, légende, outils affichés, et mots-clés de déclenchement de chaque outil.

Pensé pour l'onglet Code de l'application de bureau Claude ; il s'affiche aussi dans Claude Code au terminal. Prévu pour Windows, macOS et Linux (testé surtout sous Windows).

## Installation

Dans Claude Code :

```
/plugin marketplace add greyven/toolshelf
/plugin install toolshelf@toolshelf
/reload-plugins
```

Le panneau s'ouvre au début de chaque discussion. La commande `/outils` le rouvre et actualise la liste.

## Personnaliser

| Pour… | Où |
|---|---|
| Changer la langue, les couleurs, les mots-clés | ⚙ Réglages, dans le panneau |
| Modifier ou ajouter une fiche livrée | `fiches/fr.json` et `fiches/en.json` |
| Ajouter un programme du PC (Blender, Git…) | `fiches/outils-pc.json` : `{ "id": "Blender", "program": "blender" }` |
| Ajouter une langue | un fichier dans `hooks/textes/` sur le modèle de `en.ts`, la langue dans `types/index.d.ts`, et `fiches/<langue>.json` |

Après une modification d'une fiche, **↻ Actualiser** suffit ; après une modification du code, `/reload-plugins`.

Tes réglages et les fiches rédigées automatiquement sont gardés dans `~/.claude/toolshelf-settings.json`.

## Un projet que j'espère communautaire

Je ne suis pas développeur, et je ne serai pas en mesure de relire et de garantir chaque proposition de code envoyée sur ce dépôt. Plutôt que de laisser des propositions sans réponse, je préfère dire clairement comment le projet peut vivre :

- **Copiez-le et améliorez-le librement.** La licence MIT l'autorise, à la seule condition de garder la mention de l'auteur d'origine (le fichier `LICENSE`).
- **Faites-le savoir.** Si vous publiez une version améliorée, ouvrez une *issue* sur ce dépôt avec le lien vers votre copie (*fork*), ou citez ce dépôt dans votre README. C'est ainsi que tout le monde, moi compris, peut profiter des améliorations.
- **Les propositions directes (*pull requests*) sont bienvenues**, mais elles peuvent attendre longtemps ou ne jamais être fusionnées si je ne peux pas en juger la sûreté. Ce n'est pas un refus de votre travail : votre copie reste le meilleur endroit pour le partager.
- Si une personne de confiance souhaite **aider à maintenir** le projet, elle est la bienvenue : dites-le dans une *issue*.

**Sécurité.** Ce mod exécute du code sur votre ordinateur (il lit vos fichiers de configuration Claude et peut déplacer des dossiers de skills). Comme pour tout plugin, lisez le code d'une copie avant de l'installer.

## Licence

MIT — voir [LICENSE](LICENSE).

---

<a id="english"></a>

# Toolshelf — My Installed Tools

A panel for Claude Code that shows **all your tools in one place**: plugins, skills, connectors and programs installed on your computer. It explains what each one is for, **suggests the right tool while you type your request**, and lets you enable or disable a tool with one click.

> **Prototype version.** The panel works and is used daily, but there is plenty left to improve. Anyone who wants to contribute is welcome: see [A project I hope will become community-driven](#a-project-i-hope-will-become-community-driven).

## What it does

- **Lists your tools** on its own, with no list to maintain: plugins, personal skills, connectors (claude.ai ones included) and computer programs described in `fiches/outils-pc.json`.
- **One card per tool**: what it does, how to use it, why and when, examples. Seven cards are shipped; for other tools, a card is written automatically by a small model (Haiku).
- **Suggestions while you type**: a band above the prompt suggests the tools that fit what you are writing, from their name and keywords.
- **Highlights** the tool in use while Claude works.
- **Checkboxes** to enable or disable a plugin, a personal skill or a connector, without deleting anything.
- **Settings** (⚙): language (French or English), colors, legend, shown tools, and each tool's trigger keywords.

Designed for the Code tab of the Claude desktop app; it also shows in Claude Code in the terminal. Meant for Windows, macOS and Linux (tested mostly on Windows).

## Installation

In Claude Code:

```
/plugin marketplace add greyven/toolshelf
/plugin install toolshelf@toolshelf
/reload-plugins
```

The panel opens at the start of each conversation. The `/outils` command reopens it and refreshes the list.

## Customizing

| To… | Where |
|---|---|
| Change the language, colors, keywords | ⚙ Settings, in the panel |
| Edit or add a shipped card | `fiches/en.json` and `fiches/fr.json` |
| Add a computer program (Blender, Git…) | `fiches/outils-pc.json`: `{ "id": "Blender", "program": "blender" }` |
| Add a language | a file in `hooks/textes/` modeled on `en.ts`, the language in `types/index.d.ts`, and `fiches/<language>.json` |

After editing a card, **↻ Refresh** is enough; after editing the code, `/reload-plugins`.

Your settings and the automatically written cards are kept in `~/.claude/toolshelf-settings.json`.

## A project I hope will become community-driven

I am not a developer, and I will not be able to review and vouch for every code contribution sent to this repository. Rather than leave contributions unanswered, I prefer to say clearly how the project can live on:

- **Copy it and improve it freely.** The MIT license allows it, as long as you keep the original author notice (the `LICENSE` file).
- **Let people know.** If you publish an improved version, open an *issue* on this repository with a link to your fork, or mention this repository in your README. That way everyone, me included, can benefit from the improvements.
- **Pull requests are welcome**, but they may wait a long time or never be merged if I cannot judge whether they are safe. This is not a rejection of your work: your fork remains the best place to share it.
- If someone trustworthy would like to **help maintain** the project, they are welcome: say so in an *issue*.

**Security.** This mod runs code on your computer (it reads your Claude configuration files and can move skill folders). As with any plugin, read the code of a fork before installing it.

## License

MIT — see [LICENSE](LICENSE).
