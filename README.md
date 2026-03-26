# RiceDesk Admin Website

Een statische website die fungeert als CMS voor de RiceDesk Azure Functions API. Gebouwd met alleen HTML, Tailwind CSS (via CDN) en vanilla JavaScript.

## ✨ Features

- 📊 **Dashboard** met real-time statistieken en KPI's
  - Totaal overzicht van klanten, facturen, betalingen, abonnementen
  - Financieel overzicht (betaald, openstaand, MRR)
  - Waarschuwingen voor achterstallige facturen en verlopende abonnementen
  - Recente activiteit (laatste facturen en betalingen)
- 🔍 **CRUD operaties** voor alle entiteiten
- 🎨 **Modern UI** met Tailwind CSS
- 📱 **Responsive design** werkt op desktop, tablet en mobiel
- 💾 **Lokale configuratie** opslag in localStorage
- 🚀 **Static hosting** via GitHub Pages
- 🔌 **API integratie** met Azure Functions

## 📁 Project Structuur

```
docs/
├── index.html              # Hoofdpagina
└── js/
    ├── app.js             # Applicatie initialisatie
    ├── config.js          # Configuratie beheer
    ├── api.js             # API wrapper functies
    ├── ui.js              # UI helper functies
    ├── dashboard.js       # Dashboard met statistieken en KPI's
    ├── customers.js       # Klanten beheer
    ├── invoices.js        # Facturen beheer
    ├── payments.js        # Betalingen beheer
    └── subscriptions.js   # Abonnementen beheer
```

## 🚀 Lokaal Testen

### Optie 1: Python HTTP Server
```bash
cd docs
python -m http.server 8000
```

Open browser: http://localhost:8000

### Optie 2: VS Code Live Server
1. Installeer de "Live Server" extensie in VS Code
2. Rechtsklik op `index.html`
3. Kies "Open with Live Server"

### Optie 3: Node.js http-server
```bash
npm install -g http-server
cd docs
http-server -p 8000
```

## 🌐 Deployen naar GitHub Pages

### Stap 1: Push naar GitHub
```bash
git add docs/
git commit -m "Add admin website"
git push origin main
```

### Stap 2: Activeer GitHub Pages
1. Ga naar je repository op GitHub
2. Klik op **Settings** → **Pages**
3. Bij **Source**, selecteer **main branch** en **/docs folder**
4. Klik op **Save**
5. Je website is nu beschikbaar op: `https://[je-username].github.io/[repo-naam]/`

### Stap 3: CORS Configuratie Update
Na deployment moet je de CORS settings in je Azure Function updaten:

1. Open Azure Portal
2. Ga naar je Function App
3. Ga naar **Settings** → **CORS**
4. Voeg je GitHub Pages URL toe: `https://[je-username].github.io`
5. Klik op **Save**

## ⚙️ Configuratie

Bij eerste gebruik wordt je gevraagd om de API instellingen te configureren:

- **API Base URL**: De URL van je Azure Functions
  - Lokaal: `http://localhost:7071/api`
  - Productie: `https://ricedesk-api.azurewebsites.net/api`
  
- **Function Key**: (optioneel) Je Azure Function key voor authenticatie
  - Lokaal: laat leeg
  - Productie: haal op uit Azure Portal → Function App → App Keys

Deze instellingen worden lokaal opgeslagen in je browser (localStorage).

## 🔐 Beveiliging

### Lokale Ontwikkeling
- Geen Function Key nodig
- CORS staat localhost toe

### Productie
- Gebruik altijd een Function Key
- Beperk CORS tot je GitHub Pages domein
- Bewaar je Function Key nooit in de code
- Gebruikers moeten de Function Key zelf invoeren via de instellingen

## 🛠️ Technische Details

### API Communicatie
De website gebruikt de Fetch API om te communiceren met Azure Functions:

```javascript
// Voorbeeld API call
const response = await fetch(`${apiUrl}/customers`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'x-functions-key': apiKey // als geconfigureerd
    }
});
```

### CORS Vereisten
De Azure Functions moeten CORS ingeschakeld hebben voor:
- `http://localhost:8000` (lokale ontwikkeling)
- `https://*.github.io` (GitHub Pages)

### Browser Compatibiliteit
- Moderne browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features gebruikt (arrow functions, async/await, template literals)
- Geen IE11 ondersteuning

## 📖 Gebruik

### Dashboard Bekijken
Het **Dashboard** is je startpunt en geeft een compleet overzicht:

**Hoofd Statistieken:**
- Totaal aantal klanten, facturen, betalingen en abonnementen
- Visuele indicatoren met kleuren en iconen
- ✨ **Quick Action Buttons**: Klik op de + button in elke card om direct een nieuwe toe te voegen!

**Financieel Overzicht:**
- Totaal betaald: Som van alle betaalde facturen
- Openstaand: Som van alle nog te betalen facturen
- MRR (Monthly Recurring Revenue): Som van alle actieve abonnementen

**Waarschuwingen & Actiepunten:**
- 🔴 Achterstallige facturen (past due date)
- 🟠 Verlopende abonnementen (binnen 30 dagen)
- 🔵 Veel openstaande facturen (> 10)

**Recente Activiteit:**
- Laatste 5 facturen met status
- Laatste 5 betalingen met methode

### Quick Actions vanaf Dashboard

Het dashboard heeft nu handige **+ buttons** in elke statistiek card:
- **Klanten card** → Klik + om direct een nieuwe klant aan te maken
- **Facturen card** → Klik + om direct een nieuwe factuur aan te maken  
- **Betalingen card** → Klik + om direct een nieuwe betaling aan te maken
- **Abonnementen card** → Klik + om direct een nieuw abonnement aan te maken

Deze buttons openen direct het juiste formulier met alle automatische defaults!

### Klanten Beheren
1. Klik op het **Klanten** tabblad (of gebruik de + button op het dashboard)
2. Klik op **Nieuwe Klant** om een klant toe te voegen
3. **Klant ID wordt automatisch gegenereerd** (GUID)
4. Vul het formulier in met contactpersoon en bedrijfsinformatie
5. Klik op **Opslaan**

**Features:**
- ✅ Automatische GUID generatie voor nieuwe klanten
- ✅ Readonly ID veld (niet bewerkbaar)

### Facturen Beheren
1. Klik op het **Facturen** tabblad
2. Klik op **Nieuwe Factuur**
3. **Factuurnummer wordt automatisch gegenereerd** (bijv. INV-0001, INV-0002)
4. **Factuurdatum** staat standaard op vandaag
5. **Vervaldatum** staat standaard op +14 dagen
6. Vul klant ID en bedrag in
7. Klik op **Opslaan**

**Features:**
- ✅ Automatisch oplopend factuurnummer (INV-0001, INV-0002, etc.)
- ✅ Slimme standaard datums (vandaag en +14 dagen)
- ✅ Readonly factuurnummer bij bewerken

### Betalingen Beheren
1. Klik op het **Betalingen** tabblad
2. Klik op **Nieuwe Betaling**
3. **Betaling ID wordt automatisch gegenereerd** (bijv. PAY-0001, PAY-0002)
4. **Betalingsdatum** staat standaard op vandaag
5. **Betaalmethode** staat standaard op "Contant"
6. Koppel de betaling aan een factuur en vul bedrag in
7. Klik op **Opslaan**

**Features:**
- ✅ Automatisch oplopend betaling ID (PAY-0001, PAY-0002, etc.)
- ✅ Standaard betalingsdatum: vandaag
- ✅ Standaard betaalmethode: Contant
- ✅ Readonly betaling ID bij bewerken

### Abonnementen Beheren
1. Klik op het **Abonnementen** tabblad
2. Klik op **Nieuw Abonnement**
3. **Abonnement ID wordt automatisch gegenereerd** (bijv. SUB-0001, SUB-0002)
4. **Selecteer een klant** uit de dropdown lijst (toont bedrijfsnaam + ID)
5. **Startdatum** staat standaard op vandaag
6. **Einddatum** staat standaard op +1 jaar
7. Vul plan naam en prijs in
8. Klik op **Opslaan**

**Features:**
- ✅ Automatisch oplopend abonnement ID (SUB-0001, SUB-0002, etc.)
- ✅ Klanten dropdown met actieve klanten (bedrijfsnaam + ID)
- ✅ Slimme standaard datums (vandaag en +1 jaar)
- ✅ Readonly velden bij bewerken
- ✅ Status standaard op "Actief"

## 🐛 Troubleshooting

### "Failed to fetch" fout
- Controleer of Azure Functions draaien
- Controleer API URL in instellingen
- Controleer CORS configuratie

### 401 Unauthorized
- Controleer of Function Key correct is ingesteld
- Lokaal: zorg dat `local.settings.json` geen authenticatie vereist

### CORS errors
- Controleer `host.json` CORS settings
- Voeg je GitHub Pages URL toe aan allowed origins
- Herstart Azure Functions na CORS wijziging

## 🎨 Customization

### Styling Aanpassen
De website gebruikt Tailwind CSS via CDN. Om kleuren aan te passen, wijzig de classes in `index.html`:

```html
<!-- Voorbeeld: verander primaire kleur van blauw naar groen -->
<button class="bg-green-600 hover:bg-green-700">...</button>
```

### Functionaliteit Uitbreiden
Voeg nieuwe functies toe door:
1. Nieuwe functies te maken in relevante `.js` bestanden
2. HTML te updaten in `index.html` of dynamisch te genereren

## 📄 Licentie

Dit is onderdeel van het RiceDesk project.

## 🤝 Contributing

Pull requests zijn welkom! Voor grote wijzigingen, open eerst een issue om te bespreken wat je wilt veranderen.
