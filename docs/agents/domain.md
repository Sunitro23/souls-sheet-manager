# Domain docs

## Organisation

Single-context : `GLOSSARY.md` à la racine et décisions dans `docs/adr/`.

## Lecture ciblée

Avant d’explorer une zone, lire le glossaire et uniquement les ADR qui concernent cette zone. Si ces documents sont absents, poursuivre silencieusement : ne pas signaler leur absence ni proposer leur création par anticipation. Le skill `domain-modeling` les crée lorsque des termes ou décisions sont effectivement établis.

## Vocabulaire et décisions

Utiliser les termes définis dans le glossaire pour les tickets, propositions, hypothèses et tests. Si un concept manque, vérifier qu’il correspond au domaine, puis le relever pour `domain-modeling`.

Signaler explicitement toute proposition qui contredit une ADR, avec sa référence et la raison justifiant son réexamen.
