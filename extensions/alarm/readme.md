# Alarm extension

# Alarm

Dette modul gør det muligt at udpege ledninger med alarmtråde og alarm skabe

## Flow

Flowet er som følger:

1. Bruger starter modulet
   a. Er brugeren ikke logget ind i vidi, gives mulighed for login
2. Når der er udpeget områder eller punkter, sendes de tilbage til `blueidea` modulet, hvor der søges på matrikler og de adresser der er koblet på dem.
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
/*
 * @author     Gunnar Jul Jensen <gjj@mapcentia.com>
 * @copyright  2020- Geopartner A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

module.exports = {
    users: {
        // med kabelskab
        "5e334ba5-54e3-4e93-b146-d63aa0212aa1": {
            "alarmkabel_distance": 100,
            "alarmkabel_art": 2,
            "alarmkabel": true,
            "udpeg_layer": "ledningsplan_fjv.vw_centerlinje",
            "alarm_skab": {
                "layer": "fiber.vw_telekom_komponent_alarm",
                "geom": "the_geom",
                "key": "gid",
                "name": "skabsnummer"
            }
        },
        // uden kabelskab
        "5e334ba5-54e3-4e93-b146-d63aa0212aa2": {
            "alarmkabel_distance": 100,
            "alarmkabel_art": 2,
            "alarmkabel": true,
            "udpeg_layer": "ledningsplan_fjv.vw_centerlinje",
            "alarm_skab": null
        }
    }
};
```
### config.alarm.js:

| Property | Type   | Description       |
| -------- | ------ | ----------------- |
| users    | object | bruger konfiguration, se herunder |

| Property         | Type    | Default | Description                                                                             |
| ---------------- | ------- | ------- | --------------------------------------------------------------------------------------- |
| alarmkabel       | boolean | True    | Om brugeren skal have adgang til alarmkabel-værktøjerne                                 |
| alarm_skab       | obj     |         | Objekt med opsætning af alarmskabe                                                      |
| alarmkabel_art   | number  | 2        | angiver det forsyningsart der søges efter i dd  lukkeliste.lukkeplan_forsyningsarter   |
| layersOnStart    | array   |         | Liste med lag der skal tændes når modulet starter. bliver slukket når modulet slukkes   |

 

### Alarm_skab:

| Property         | Type   | Default | Description                                                                     |
| ---------------- | ------ | ------- | ------------------------------------------------------------------------------- |
| layer            | string |         | navnet på laget der benyttes til alarm-beregning hvor alarmkablerne skal findes |
| key              | string |         | kolonnenavn på `layer` som skal bruges til at finde alarmkablerne               |
| name             | string |         | SQL udtryk der bruges til at finde teksten til dropdown                         |
| geom             | string |         | kolonnenavn på `layer` som indeholder geometrien                                |
| layersOnStart    | array  |         | Liste med lag der skal tændes når alarmskabe bruges                             |

### ?config=*.json:

Der skal ligeledes laves en opsætning af extension i kørselsmiljøet. Se nedenfor.

Denne extension afhænger af `session` extensionen, så den skal også være loaded.

```json
{
  "brandName": "alarm",
  "enabledExtensions": ["session", "alarm"],
  "extensionConfig": {
    "blueidea": {
      "userid": "d7a12844-5fc9-4316-9af7-b841fcc3d399",
      "alarmkabel_distance": 75,
      "alarmkabel_art": 1
    }
  }
}
```

 