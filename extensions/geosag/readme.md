# Geosag

Dette modul gør det muligt at udpege matrikler der knyttes direkte til en sag i docunote. Dette gøres som en del af sagsflowet for alle sager der kan stedfæstes.

## Flow

Extension startes typisk med query-parameteren: `&sagsnr=10248518` - hvor heltallet er en direkte kobling til sagen i docunote. Derefter er det muligt at se de allerede tilknyttede matrikler, samt udpege nye. Kortet zoomer hen til det relevante sted.

Er brugeren logget ind med `geosag_inten`-brugeren, vil man ligeledes kunne se åbne sager.

## Opsætning

Der laves en configuration i `config/gp/config.geosag.js` som beskriver forbindelsen ned igennem docunoteapi. Der laves filtrering på IP-adresser, så det kun er muligt at køre denne forbindelse fra Geopartners eksterne IP-adresse.

Filen har følgende struktur

    module.exports = {
    "applicationKey": "DOCUNOTE_API_KEY",
    "userName": "DOMAIN_USER",
    "userKey": "DOCUNOTE_USER_KEY",
    "hostUrl": "DOCUNOTE_HOST",
    "version": "v2",
    "synchronizeSource": 101,
    "partsType": 19,
    "partsPicker": "Matrikel",
    "personListId": 5,
    "allow_from": [
            WHITELIST
        ]
    }