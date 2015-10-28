# Importer fra Moves-app til Russland på tvers

Programmet baserer seg på å bruke Moves-appen [moves-export](http://moves-export.herokuapp.com/).

* Registrer pin i moves-app fra moves-export. Du vil da få et token. Legg det tokenet inn i config.json under "token".
* Du må kunne brukernavn og passordet til Russland på tvers. Legg det inn i config.json
* Hvis du har mongo på en sær url, endre den også.
* Det siste du må ha er usernr i Russland på tvers. Use litt brains, men f.eks sjekk ut url det postes til når du registrerer skritt, så ser du din id. 

Sett opp en crontab elns slik at programmet kjører hver dag. Gjerne før lunsj. Programmet benytter din mongo for å holde track på progresjonen, men er naiv og regner med at alt går bra!
Skulle du mange data så får du bare slette litt fra mongo og kjøre på nytt.

Da er spillet automagisk! enjoy!