# Rollenstructuur RiceDesk

## Overzicht

RiceDesk ondersteunt vier gebruikersrollen met verschillende toegangsniveaus:

### 1. Admin
- **Volledige toegang** tot alle functies
- Kan **verwijderen** (klanten, orders, facturen, etc.)
- Kan **bewerken** van alle gegevens
- Kan **gebruikers beheren**
- Ziet **alle gevoelige informatie** (klantgegevens, betalingen)

### 2. Administratief Medewerker
- Kan **alles bewerken** (klanten, orders, facturen, abonnementen)
- Kan **geen items verwijderen**
- Kan **geen gebruikers beheren**
- Ziet **alle gevoelige informatie** (klantgegevens, betalingen)

### 3. Medewerker
- **Alleen lezen** toegang
- Kan **niets bewerken of verwijderen**
- Ziet **alle gevoelige informatie** (klantgegevens, betalingen)
- Kan rapporten bekijken en PDF's downloaden

### 4. Gast
- **Beperkte leestoegang**
- Ziet **geen gevoelige klantinformatie** (contactgegevens worden verborgen als ***)
- Ziet **geen betalingsinformatie**
- Kan alleen algemene informatie bekijken

## Implementatie

### Backend
- `User` model heeft `Role` property (string)
- Mogelijke waarden: `"Admin"`, `"AdministratiefMedewerker"`, `"Medewerker"`, `"Gast"`
- Backward compatibility: oude users zonder Role krijgen automatisch `"Medewerker"`

### Frontend
- `auth.js` bevat role-checking functies:
  - `getUserRole()` - Haalt huidige rol op
  - `hasRole([roles])` - Check of user één van de opgegeven rollen heeft
  - `canEdit()` - Check of user mag bewerken (Admin of AdministratiefMedewerker)
  - `canDelete()` - Check of user mag verwijderen (alleen Admin)
  - `canViewSensitive()` - Check of user gevoelige info mag zien (niet Gast)

### UI Aanpassingen
- Knoppen worden dynamisch getoond/verborgen op basis van rol
- `renderActionButton()` helper in `ui.js` voor consistent gedrag
- Gevoelige informatie wordt gefilterd voor Gast rol:
  - Klantcontactgegevens: `***`
  - Betalingsinformatie: niet getoond

## Gebruik

### Een nieuwe gebruiker aanmaken
1. Ga naar **Gebruikers** (alleen zichtbaar voor Admin)
2. Klik op **Nieuwe gebruiker**
3. Vul gegevens in en selecteer een rol
4. Klik op **Opslaan**

### Rol wijzigen
1. Ga naar **Gebruikers**
2. Klik op het edit icoon bij de gebruiker
3. Wijzig de rol in de dropdown
4. Klik op **Opslaan**

## Migratie
Bestaande users met `isAdmin: true` worden bij login automatisch gemigreerd naar `Role: "Admin"`.
Bestaande users met `isAdmin: false` worden gemigreerd naar `Role: "Medewerker"`.

## Aanbevelingen
- Geef alleen **Admin** rechten aan vertrouwde gebruikers
- Gebruik **Administratief Medewerker** voor dagelijkse administratie
- Gebruik **Medewerker** voor medewerkers die alleen moeten kunnen inzien
- Gebruik **Gast** voor externe partijen die beperkte inzage nodig hebben
