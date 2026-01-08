# BlueIdea / Lukkeliste

Dette modul gør det muligt at udpege adresser, og sende dem direkte til BlueIdea. Denne logik kan udbygges med at finde adresser på baggrund af eksisterende ledningsnet. Opsætningen af denne er dog mere omstændig, og kræver at der er en database med et sundt ledningsnet.

## Flow

Flowet er som følger:

1. Bruger starter modulet
   a. Er brugeren ikke logget ind i vidi, gives mulighed for login
2. Brugeren udpeger områder (sendes til `draw` modulet) eller brugeren udpeger et punkt i forhold til ledningsnettet.
   a. For at brugeren kan udpege punkter i forhold til ledningsnettet, skal brugeren være opsat som beskrevet herunder.
3. Når der er udpeget områder eller punkter, sendes de tilbage til `blueidea` modulet, hvor der søges på matrikler og de adresser der er koblet på dem.
4. Efter der er fundet adresser, kan brugeren vælge at

## Opsætning

Der er flere dele i opsætningen af denne extension. Da den både skal håndtere credentials og databaseafhængigheder, er det vigtigt at følge nedenstående punkter. Modulet kan opsættes i følgende konfigurationer:

- Kun BlueIdea
  - lukkeliste er `false`
  - blueidea er `true`, samt username + password
- Kun Lukkeliste
  - lukkeliste er `true`, samt `forsyningsarter`
  - blueidea er `false`
- BlueIdea og Lukkeliste
  - lukkeliste er `true`, samt `forsyningsarter`
  - blueidea er `true`, samt username + password
- Lukkeliste med alarm-funktionalitet
  - lukkeliste er `true`
  - alarmkabel er `true`, samt `alarm_skab`

### Vidi

Der skal oprettes en configurationsfil som nedenunder. Denne skal placeres i `config/gp/config.blueidea.js`.

Filen indlæses ved load af vidi, så enhver ændring i filen kræver en genstart af servicen.

```js
module.exports = {
  debug: true,
  hostname: "https://api.der-ikke-eksisterer.dk/",
  users: {
    "USER_KEY": {
      username: "superuser",
      password: "supersecret",
      profileid: {
        3793: "profilnavn i selection",
      },
      lukkeliste: true,
      blueidea: true,
      forsyningsarter: [
        {
          value: "Vandforsyning",
          ventil_layer: "danvand_gp.vw_ventil",
          ventil_layer_key: "gid",
          ventil_layer_name_key: "knudenavn",
          udpeg_layer: "danvand_gp.vw_dvg_ledning",
          ventil_export: {
            Knudenavn: "knudenavn",
            Betegnelse: "betegnelse",
            Dimension: "dimension",
          },
        }
      ],
      alarmkabel: true,
      layersOnStart: [
        "danvand_gp.vw_dvg_ledning",
      ],
    },
  },
};
```
### config.blueidea.js:

| Property | Type   | Description       |
| -------- | ------ | ----------------- |
| hostname | string | blueidea hostname |
| users    | object | bruger konfiguration, se herunder |

| Property         | Type    | Default | Description                                                                             |
| ---------------- | ------- | ------- | --------------------------------------------------------------------------------------- |
| debug            | boolean |         | Styrer om beskeder i blueidea sættes som testmode                                       |
| username         | string  |         | Blueidea brugernavn                                                                     |
| password         | string  |         | Blueidea adgangskode                                                                    |
| blueidea         | boolean | `False` | Om brugeren skal have adgang til blueidea-værktøjerne                                   |
| lukkeliste       | boolean | `False` | Om brugeren skal have adgang til lukkeliste-værktøjerne                                 |
| profileid        | obj     |         | Objekt med profilid & alias                                                             |
| forsyningsarter  | array   |         | Navnet på layeret hvor ventil-lukkeliste skal findes                                    |
| alarmkabel       | boolean | `False` | Om brugeren skal have adgang til alarmkabel-værktøjerne                                 |
| alarm_skab       | obj     |         | Objekt med opsætning af alarmskabe                                                      |
| layersOnStart    | array   |         | Liste med lag der skal tændes når modulet starter. bliver slukket når modulet slukkes   |

### forsyningsarter:
| Property               | Type   | Default | Description                                                                                                                |
| ---------------------- | ------ | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| value                  | string |         | Tekststreng der vises i dropdown                                                                                           |
| ventil_layer           | string |         | Navnet på laget hvor ventil-lukkeliste skal findes                                                                         |
| ventil_layer_key       | string |         | Kolonnenavn der bruges som nøgle til filtrering                                                                            |
| ventil_layer_name_key  | string |         | Kolonnenavn der bruges som visningsnavn ved udvælgelse af utilgængelige ventiler                                           |
| udpeg_layer            | string |         | Navnet på laget som skal tændes, når der udpeges i lukkeliste                                                              |
| ventil_export          | obj    |         | Objekt med opsætning af ventil-eksport. Nøgler er eksportkolonnenavne; værdier er kolonnenavne, der læses fra ventil_layer |

> [!IMPORTANT]  
> Rækkefølgen af forsyningsarter i listen `forsyningsarter` skal hænge sammen med styretabellen idet det er artens index der afgører hvilket ledningnet der analyseres op imod.

### Alarm_skab:

| Property | Type   | Default | Description                                                                     |
| -------- | ------ | ------- | ------------------------------------------------------------------------------- |
| layer    | string |         | navnet på laget der benyttes til alarm-beregning hvor alarmkablerne skal findes |
| key      | string |         | kolonnenavn på `layer` som skal bruges til at finde alarmkablerne               |
| name     | string |         | SQL udtryk der bruges til at finde teksten til dropdown                         |
| geom     | string |         | kolonnenavn på `layer` som indeholder geometrien                                |

### ?config=*.json:

Der skal ligeledes laves en opsætning af extension i kørselsmiljøet. Se nedenfor.

Denne extension afhænger af `session` extensionen, så den skal også være loaded.

```json
{
  "brandName": "Lukkeliste",
  "enabledExtensions": ["session", "blueidea"],
  "extensionConfig": {
    "blueidea": {
      "userid": "d7a12844-5fc9-4316-9af7-b841fcc3d399",
      "alarmkabel_distance": 75,
      "alarmkabel_art": 1
    }
  }
}
```

| Property            | Type | Default | Description                                        |
| ------------------- | ---- | ------- | -------------------------------------------------- |
| user                | guid |         | direkte reference til server-konfiguration         |
| alarmkabel_distance | int  | 100     | afstand i meter fra udpeget punkt til alarmvisning |
| alarmkabel_art      | int  |         | Forsyningsart til alarmkabel-analyse               |

### GC2

Den bruger der tænkes at bruge lukkeliste-værktøjerne skal have en rolle med læse- og skriveadgang til tabellerne:

- `lukkeliste.beregn_ventiler`
- `lukkeliste.beregn_afskaaretmatrikler`
- `lukkeliste.beregn_afskaaretnet`
- `lukkeliste.beregnlog`
- `lukkeliste.lukkestatus`
- _*Lag der er defineret i `alarm_skab` hvis denne er relevant_