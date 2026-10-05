/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

export default class Henvendelse {
  static tableColumns = [
    { key: "gid", label: "Id", visible: false },
    { key: "overskrift", label: "Overskrift", visible: true },
    { key: "problemtype", label: "Problemtype", visible: true },
    { key: "ansvarligid", label: "Ansvarlig", visible: true  },
  ];

  constructor(props = {}) {
    this.gid = props.gid ?? null;
    this.overskrift = props.overskrift ?? null;
    this.placering = props.placering ?? null;
    this.navn = props.navn ?? null;
    this.problemtype = props.problemtype ?? null;
    this.ansvarligid = props.ansvarligid ?? null;
    this.kommentar = props.kommentar ?? null;
    this.indberetningdato = props.indberetningdato ?? null;
    this.haendelsedato = props.haendelsedato ?? null;
    this.udkaldid = props.udkaldid ?? null;
    this.prioritetid = props.prioritetid ?? null;
    this.statusid = props.statusid ?? null;
    this.oprettetdato = props.oprettetdato ?? null;
    this.oprettetid = props.oprettetid ?? null;
    this.forsyningtypeid = props.forsyningtypeid ?? null;
    // Postgres folds the unquoted alias "WKT" to lowercase
    this.wkt = props.wkt ?? props.WKT ?? null;
    this.totalt_antal = props.totalt_antal ?? null;
  }

  toTableRow() {
    return Object.fromEntries(
      Henvendelse.tableColumns.map(({ key }) => [key, this[key]],)
    );
  }

  static fromFeature(feature) {
    return new Henvendelse(feature?.properties ?? feature ?? {});
  }
}
