SecureScan
Rapport de Sécurité
Projet : SecureScan

Date : 5 mars 2026

Score de sécurité : 0/100 (Grade F)

Langage : CSS, HTML, JavaScript

Vulnérabilités détectées : 15 (1 critiques, 14 élevées, 0 moyennes, 0 basses)

RAPPORT DE SÉCURITÉ APPLICATIVE Projet : SecureScan Date d'analyse : 05 mars 2026 Classificiation : Confidentiel

RÉSUMÉ EXÉCUTIF
L'analyse de sécurité conduite sur le projet SecureScan révèle un état critique nécessitant une intervention immédiate. Avec un score de sécurité de 0 sur 100 et une note globale F, le projet présente un niveau de risque inacceptable pour un déploiement en environnement de production. Au total, quinze vulnérabilités ont été identifiées, dont une classée critique et quatorze classées comme élevées. Aucune vulnérabilité de niveau moyen ou bas n'a été recensée, ce qui signifie que l'intégralité des failles détectées représente une menace directe et sérieuse pour la sécurité du système et des données qu'il manipule.

Les risques identifiés se concentrent autour de deux grandes familles de vulnérabilités. La première, et de loin la plus représentée, concerne les failles de traversée de chemin, qui permettraient à un attaquant d'accéder à des fichiers arbitraires sur le serveur. La seconde, classée critique, porte sur une injection de commandes système via l'utilisation non sécurisée du module child_process de Node.js. Ces deux catégories de vulnérabilités touchent principalement les fichiers du backend, en particulier le contrôleur de scan et le service Git, qui constituent le cœur fonctionnel de l'application.

L'impact potentiel de ces vulnérabilités est particulièrement grave dans le contexte d'un outil comme SecureScan, dont la vocation même est d'analyser des dépôts de code. Un attaquant exploitant ces failles pourrait prendre le contrôle total du serveur hôte, exfiltrer des fichiers sensibles du système d'exploitation, exécuter des commandes arbitraires à distance, ou encore compromettre l'intégrité des analyses produites par l'outil. Le niveau d'urgence est maximal : aucune mise en production ne devrait être envisagée tant que ces vulnérabilités n'ont pas été corrigées et qu'un nouvel audit n'a pas confirmé leur résolution.

Il est également préoccupant de constater que ces failles sont concentrées dans des fichiers centraux de l'application, ce qui suggère un manque de sensibilisation aux pratiques de développement sécurisé au sein de l'équipe. Une revue complète des pratiques de codage, accompagnée d'une formation aux principes de sécurité applicative, est fortement recommandée en complément des corrections techniques à apporter.

ANALYSE DÉTAILLÉE DES ERREURS
Catégorie OWASP A05 — Mauvaise configuration de sécurité : Injection de commandes via child_process

La vulnérabilité la plus grave identifiée dans ce projet concerne l'utilisation du module natif child_process de Node.js dans le fichier backend\src\controllers\scan.controller.js, à la ligne 28. Ce module permet à une application Node.js d'exécuter des commandes directement sur le système d'exploitation sous-jacent, ce qui est une fonctionnalité puissante mais extrêmement dangereuse lorsqu'elle est mal encadrée. Dans le cas présent, l'analyse révèle que la commande transmise à child_process est construite à partir d'un argument nommé cmd, dont la valeur semble provenir d'une entrée externe, potentiellement contrôlable par un utilisateur.

Cette situation constitue une injection de commandes, l'une des vulnérabilités les plus critiques en sécurité applicative. Concrètement, si un attaquant parvient à manipuler la valeur de cet argument, il peut injecter des commandes système supplémentaires qui seront exécutées avec les privilèges du processus Node.js sur le serveur. Dans le contexte de SecureScan, qui traite des dépôts de code et interagit avec des outils d'analyse, ce vecteur d'attaque est particulièrement accessible et exploitable. Un attaquant pourrait, par exemple, soumettre un nom de dépôt ou un paramètre de scan contenant des caractères spéciaux tels que des points-virgules, des esperluettes ou des pipes, afin d'enchaîner des commandes malveillantes à la suite de la commande légitime.

Les conséquences d'une exploitation réussie seraient catastrophiques : prise de contrôle complète du serveur, installation de logiciels malveillants, exfiltration de l'ensemble des données présentes sur la machine, création de portes dérobées persistantes, ou encore utilisation du serveur comme point de rebond pour attaquer d'autres systèmes du réseau interne. La correction de cette vulnérabilité doit être traitée en priorité absolue. Elle implique de ne jamais construire une commande système à partir d'une entrée utilisateur non validée, de privilégier des API de plus haut niveau lorsque cela est possible, et si l'utilisation de child_process est inévitable, de recourir à des formes sécurisées comme execFile avec des arguments séparés plutôt que des chaînes de caractères concaténées, tout en appliquant une validation stricte et une liste blanche des valeurs autorisées.

Catégorie OWASP A01 — Contrôle d'accès défaillant : Traversée de chemin et manipulation de logs

La catégorie A01 concentre à elle seule quatorze des quinze vulnérabilités identifiées, ce qui en fait la problématique dominante de ce rapport. Ces failles se répartissent en deux types distincts mais relevant du même manque de validation des entrées utilisateur.

La première et principale problématique est la traversée de chemin, également connue sous le nom de path traversal. Elle est détectée à de nombreuses reprises dans le fichier backend\src\controllers\scan.controller.js, aux lignes 62, 239, 256, 263 et 265, ainsi que dans le fichier backend\src\services\git.service.js à la ligne 55. Ces vulnérabilités surviennent lorsque des données provenant de l'utilisateur sont directement intégrées dans des appels aux fonctions path.join ou path.resolve de Node.js, sans avoir été préalablement validées ou assainies. Ces fonctions sont utilisées pour construire des chemins de fichiers sur le système, et leur usage avec des données non fiables ouvre la porte à des manipulations malveillantes. En injectant des séquences de caractères telles que ../ de manière répétée dans un paramètre, un attaquant peut sortir du répertoire de travail prévu par l'application et naviguer librement dans l'arborescence du système de fichiers du serveur. Il pourrait ainsi accéder à des fichiers de configuration contenant des mots de passe ou des clés d'API, lire des fichiers système sensibles, ou encore accéder aux résultats d'analyses d'autres utilisateurs stockés sur le serveur. La concentration de ces failles dans le contrôleur de scan, qui est le composant central de l'application, est particulièrement alarmante car ce fichier est vraisemblablement exposé à des entrées utilisateur variées et fréquentes. La correction passe par la mise en place d'une validation stricte des chemins construits, en vérifiant systématiquement que le chemin résolu reste bien confiné dans le répertoire de base autorisé, et en rejetant toute entrée contenant des séquences de traversée.

La seconde problématique de cette catégorie concerne une vulnérabilité de type format string non sécurisé, détectée dans le fichier backend\src\controllers\github.controller.js à la ligne 213. Elle se manifeste par l'utilisation d'une variable non littérale directement dans un appel à util.format ou console.log, ce qui permet à un attaquant de manipuler le contenu des messages de log en injectant des spécificateurs de format. Bien que cette vulnérabilité soit généralement considérée comme moins immédiatement exploitable que les deux précédentes, elle présente des risques concrets dans un contexte professionnel. Un attaquant pourrait falsifier les journaux d'activité de l'application, rendant toute investigation forensique ultérieure difficile voire impossible, ou masquer des actions malveillantes en corrompant les traces laissées dans les logs. Dans un outil de sécurité comme SecureScan, dont la fiabilité des rapports est la valeur fondamentale, l'intégrité des journaux est un élément critique. La correction consiste à toujours utiliser des chaînes de format constantes et littérales, en passant les variables comme arguments distincts plutôt qu'en les concaténant directement dans la chaîne de format.

Annexe : Liste des Vulnérabilités
Total : 15 vulnérabilité(s) détectée(s).

1. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\git.service.js:55

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

2. javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
high
📁 Fichier : backend\src\controllers\github.controller.js:213

Detected string concatenation with a non-literal variable in a util.format / console.log function. If an attacker injects a format specifier in the string, it will forge the log message. Try to use constant values for the format string.

3. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:62

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

4. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:62

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

5. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:239

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

6. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:239

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

7. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:256

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

8. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:263

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

9. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:265

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

10. javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
high
📁 Fichier : backend\src\server.js:20

A CSRF middleware was not detected in your express application. Ensure you are either using one such as `csurf` or `csrf` (see rule references) and/or you are properly doing CSRF validation in your routes with a token or cookies.

11. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\claude.service.js:29

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

12. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\claude.service.js:29

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

13. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\git.service.js:28

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

14. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\git.service.js:55

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

15. javascript.lang.security.detect-child-process.detect-child-process
critical
📁 Fichier : backend\src\controllers\scan.controller.js:28

Detected calls to child_process from a function argument `cmd`. This could lead to a command injection if the input is user controllable. Try to avoid calls to child_process, and if it is needed ensure user input is correctly sanitized or sandboxed.