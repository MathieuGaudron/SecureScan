SecureScan
Rapport de Sécurité
Projet : SecureScan

Date : 5 mars 2026

Score de sécurité : 0/100 (Grade F)

Langage : CSS, HTML, JavaScript

Vulnérabilités détectées : 18 (1 critiques, 17 élevées, 0 moyennes, 0 basses)

RAPPORT DE SÉCURITÉ APPLICATIVE Projet : SecureScan Date d'analyse : 05 mars 2026 Classification : Confidentiel

RÉSUMÉ EXÉCUTIF
L'analyse de sécurité conduite sur le projet SecureScan révèle un état critique de la base de code. Avec un score de sécurité de 0 sur 100 et une note globale F, le projet présente des lacunes fondamentales en matière de sécurité applicative. Au total, 18 vulnérabilités ont été identifiées, dont 1 de niveau critique et 17 de niveau élevé. Aucune vulnérabilité de faible impact n'a été recensée, ce qui signifie que l'intégralité des problèmes détectés représente un risque sérieux et immédiat pour la sécurité du système.

Les risques identifiés se concentrent principalement autour de deux catégories du référentiel OWASP Top 10 : la catégorie A01 relative aux défaillances de contrôle d'accès et de validation des entrées, qui regroupe 17 des 18 vulnérabilités détectées, et la catégorie A05 relative aux mauvaises configurations de sécurité, représentée par la vulnérabilité critique d'injection de commandes. Ces deux familles de risques touchent des composants centraux de l'application, notamment les contrôleurs de scan, le service Git et la configuration du serveur Express.

L'impact potentiel de ces vulnérabilités est particulièrement grave dans le contexte d'une application comme SecureScan, qui par nature interagit avec des dépôts de code, des systèmes de fichiers et des processus système. Un attaquant exploitant ces failles pourrait prendre le contrôle total du serveur, accéder à l'ensemble des fichiers du système hôte, manipuler les journaux applicatifs ou contourner les mécanismes de protection contre les requêtes forgées. La combinaison de ces vulnérabilités crée une surface d'attaque très large et facilement exploitable.

Au regard de la sévérité et du nombre de vulnérabilités identifiées, une remédiation immédiate est fortement recommandée avant tout déploiement en environnement de production. Le projet ne devrait en aucun cas être exposé à des utilisateurs externes dans son état actuel. Une revue de code approfondie, accompagnée d'une refonte des pratiques de validation des entrées utilisateur, doit être engagée en priorité absolue.

ANALYSE DÉTAILLÉE DES ERREURS
Catégorie A05 — Mauvaise configuration de sécurité : Injection de commandes système

La vulnérabilité la plus critique identifiée dans ce projet concerne l'utilisation non sécurisée du module child_process de Node.js dans le fichier scan.controller.js à la ligne 29. Cette vulnérabilité survient lorsqu'une application transmet directement une entrée utilisateur à une fonction d'exécution de commandes système, sans validation ni assainissement préalable. Dans le cas présent, une variable cmd, dont la valeur semble provenir d'un argument de fonction potentiellement contrôlable par l'utilisateur, est passée directement à child_process, ce qui permet à un attaquant de construire une entrée malveillante pour exécuter des commandes arbitraires sur le serveur.

Pour une application comme SecureScan, dont la vocation est précisément d'analyser des dépôts de code, ce type de vulnérabilité est particulièrement dangereux. Un attaquant qui parviendrait à injecter une commande système pourrait exécuter n'importe quel programme sur le serveur hôte, supprimer des fichiers critiques, exfiltrer des données sensibles, installer des portes dérobées ou pivoter vers d'autres systèmes du réseau interne. L'exploitation de cette faille ne requiert pas de compétences avancées et peut être réalisée avec des techniques d'injection bien documentées et largement disponibles. La correction de cette vulnérabilité doit être traitée en priorité absolue, en évitant autant que possible le recours à child_process, ou en imposant une liste blanche stricte des commandes autorisées et une validation rigoureuse de tous les paramètres d'entrée.

Catégorie A01 — Défaillances de contrôle d'accès : Traversée de chemin (Path Traversal)

La grande majorité des vulnérabilités détectées, soit 16 occurrences réparties sur plusieurs fichiers, appartiennent à la famille des attaques par traversée de chemin. Ce type de vulnérabilité se produit lorsque des données fournies par l'utilisateur sont intégrées sans validation dans des fonctions de manipulation de chemins de fichiers, telles que path.join ou path.resolve en Node.js. En injectant des séquences de caractères spéciales comme ../ ou des chemins absolus, un attaquant peut sortir du répertoire de travail prévu par l'application et accéder à des fichiers arbitraires présents sur le système de fichiers du serveur.

Dans le projet SecureScan, cette vulnérabilité est présente à de multiples endroits critiques. Le fichier scan.controller.js est particulièrement affecté, avec des occurrences aux lignes 62, 63, 252 et 269, ce qui suggère un pattern récurrent dans la manière dont les chemins de fichiers sont construits à partir des entrées utilisateur tout au long du cycle de traitement des scans. Le fichier git.service.js est également concerné à la ligne 63, indiquant que le service responsable de l'interaction avec les dépôts Git souffre du même problème. Dans le contexte d'une application qui manipule des dépôts de code et des fichiers de résultats d'analyse, un attaquant pourrait exploiter ces failles pour lire des fichiers de configuration contenant des secrets, des clés d'API ou des identifiants de base de données, voire pour écraser des fichiers système critiques si des opérations d'écriture sont également concernées. La correction passe par la mise en place d'une validation stricte des chemins reçus en entrée, en s'assurant que le chemin résolu reste bien confiné dans le répertoire de base autorisé, par exemple en comparant le chemin résolu avec path.resolve du répertoire racine attendu.

Catégorie A01 — Défaillances de contrôle d'accès : Injection dans les journaux applicatifs (Log Injection)

Une vulnérabilité de type format string non sécurisé a été détectée dans le fichier github.controller.js à la ligne 213. Ce problème survient lorsqu'une variable non littérale, dont la valeur peut être influencée par un utilisateur, est concaténée directement dans une chaîne passée à des fonctions comme util.format ou console.log. Un attaquant peut exploiter cette faiblesse en injectant des séquences de formatage spéciales ou des retours à la ligne dans la valeur de la variable, ce qui lui permet de falsifier le contenu des journaux applicatifs, d'y insérer de fausses entrées ou de masquer des activités malveillantes.

Bien que cette vulnérabilité puisse sembler moins grave que les précédentes, elle représente un risque réel pour l'intégrité des audits de sécurité et la capacité de l'équipe à détecter des intrusions. Dans un outil de sécurité comme SecureScan, la fiabilité des journaux est essentielle pour retracer les actions effectuées et identifier des comportements anormaux. Des journaux corrompus ou falsifiés peuvent conduire à des diagnostics erronés, retarder la détection d'une compromission ou induire en erreur les équipes de réponse à incident. La correction consiste à utiliser des valeurs constantes comme chaîne de format et à passer les variables dynamiques comme arguments distincts, conformément aux bonnes pratiques de journalisation sécurisée.

Catégorie A01 — Défaillances de contrôle d'accès : Absence de protection CSRF

L'analyse du fichier server.js à la ligne 20 révèle l'absence de middleware de protection contre les attaques de type Cross-Site Request Forgery (CSRF) dans la configuration de l'application Express. Une attaque CSRF consiste à amener un utilisateur authentifié à exécuter à son insu des actions non désirées sur une application web en exploitant sa session active. Sans mécanisme de protection adéquat, un attaquant peut créer une page web malveillante qui, lorsqu'elle est visitée par un utilisateur connecté à SecureScan, déclenche automatiquement des requêtes vers l'application en usurpant l'identité de cet utilisateur.

Dans le contexte de SecureScan, les conséquences d'une attaque CSRF réussie pourraient inclure le lancement de scans non autorisés sur des dépôts arbitraires, la modification de configurations sensibles, ou encore la suppression de données. L'absence de cette protection est d'autant plus préoccupante que l'application semble gérer des opérations à fort impact sur des systèmes tiers via ses intégrations GitHub et ses fonctionnalités de scan. La mise en place d'un middleware CSRF tel que csurf, combinée à l'utilisation de tokens anti-CSRF dans les formulaires et les requêtes sensibles, constitue la correction recommandée pour cette vulnérabilité.

Annexe : Liste des Vulnérabilités
Total : 18 vulnérabilité(s) détectée(s).

1. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\git.service.js:63

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

2. javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
high
📁 Fichier : backend\src\controllers\github.controller.js:213

Detected string concatenation with a non-literal variable in a util.format / console.log function. If an attacker injects a format specifier in the string, it will forge the log message. Try to use constant values for the format string.

3. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:62

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

4. javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
high
📁 Fichier : backend\src\server.js:20

A CSRF middleware was not detected in your express application. Ensure you are either using one such as `csurf` or `csrf` (see rule references) and/or you are properly doing CSRF validation in your routes with a token or cookies.

5. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:63

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

6. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:63

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

7. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:252

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

8. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:252

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

9. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:269

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

10. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:276

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

11. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\controllers\scan.controller.js:278

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

12. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\claude.service.js:29

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

13. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\claude.service.js:30

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

14. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\claude.service.js:30

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

15. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\git.service.js:34

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

16. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\git.service.js:62

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

17. javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
high
📁 Fichier : backend\src\services\git.service.js:63

Detected possible user input going into a `path.join` or `path.resolve` function. This could possibly lead to a path traversal vulnerability, where the attacker can access arbitrary files stored in the file system. Instead, be sure to sanitize or validate user input first.

18. javascript.lang.security.detect-child-process.detect-child-process
critical
📁 Fichier : backend\src\controllers\scan.controller.js:29

Detected calls to child_process from a function argument `cmd`. This could lead to a command injection if the input is user controllable. Try to avoid calls to child_process, and if it is needed ensure user input is correctly sanitized or sandboxed.