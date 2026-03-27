# Basic Authentication Setup voor RiceDesk

## Wat is er geïmplementeerd?

Basic Authentication middleware is toegevoegd aan je Azure Functions applicatie. Dit betekent dat alle API endpoints nu een gebruikersnaam en wachtwoord vereisen.

## Lokale Development

De credentials zijn geconfigureerd in `local.settings.json`:
- **Username**: `admin`
- **Password**: `*********`

Je kunt deze waarden aanpassen in het bestand `RiceDesk\local.settings.json`.

## Azure Deployment

Wanneer je de applicatie naar Azure deployed, moet je de volgende **Application Settings** toevoegen in de Azure Portal:

1. Ga naar je Azure Function App in de Azure Portal
2. Navigeer naar **Configuration** → **Application settings**
3. Voeg de volgende settings toe:
   - `BasicAuth_Username` = `admin` (of een andere gebruikersnaam)
   - `BasicAuth_Password` = `JeSterkWachtwoord123!` (kies een sterk wachtwoord!)

## Hoe werkt het?

- Alle HTTP requests naar je API endpoints moeten nu een `Authorization` header bevatten
- Format: `Authorization: Basic [base64-encoded credentials]`
- De browser zal automatisch een login popup tonen wanneer gebruikers de API proberen te bereiken

## Frontend Aanpassingen

Je JavaScript frontend bestanden moeten worden aangepast om de credentials mee te sturen bij elke API call. Bijvoorbeeld:

```javascript
// Voeg dit toe aan al je fetch calls
const headers = {
    'Authorization': 'Basic ' + btoa('admin:RiceDesk2024!'),
    'Content-Type': 'application/json'
};

fetch('/api/invoices', { 
    headers: headers 
})
.then(response => response.json())
.then(data => console.log(data));
```

## Beveiliging

⚠️ **Belangrijk**:
- Verander het wachtwoord naar iets sterks voordat je naar productie gaat!
- Basic Authentication stuurt credentials in base64 encoding (niet encrypted)
- Gebruik **altijd HTTPS** in productie om credentials te beschermen
- Overweeg OAuth2 of Azure AD voor betere beveiliging in de toekomst

## Meerdere Gebruikers

De huidige implementatie ondersteunt één gebruiker. Voor meerdere gebruikers zou je kunnen:
1. Een database met gebruikers gebruiken
2. Azure AD B2C implementeren
3. Een custom user management systeem bouwen

## Testen

Test de authenticatie met curl:
```bash
curl -u admin:RiceDesk2024! https://your-function-app.azurewebsites.net/api/invoices
```

Of in de browser wordt automatisch een login dialog getoond.
