/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import DataManager from "./DataManager";
export default class ProjectManager extends DataManager {
    constructor() {
        super();

    }

    async getAllProjects(skema) {

        try {
            const url = `/api/extension/mapstatus/GetProjects/${skema}`;
            const data = await this.fetchDataAsync(url);
            const isReadOnly = data?._auth_check?.privileges === 'write' ? false : true;
            const isLoggedIn = true;
            if (!data || !data.features || data.features.length === 0) {
                return { projects: [], isReadOnly, isLoggedIn };
            }
            const projects = data.features.map((feature) => ({ id: feature.properties.id, label: feature.properties.navn }));
            const labelTxt = "Vælg underprojekt"
            projects.unshift({ id: 0, label: labelTxt });

            return { projects, isReadOnly, isLoggedIn };
        } catch (e) {
            console.error("Error in getAllProjects: " + e);
            return { projects: [], isReadOnly: true, isLoggedIn: false };
        }
    }

    createProjectData(skema) {
        return {
            afdeling: '',
            beskrivelse: '',
            bygherreadresse: '',
            bygherreafdeling: '',
            bygherrenavn: '',
            bygherrepostnr: '',
            editdate: '',
            id: 0,
            isReadOnly: true,
            kundeid: '',
            kundeNavn: '',
            navn: '',
            oprettet: '',
            projektadresse: '',
            projektnavn: '',
            projektpostnr: '',
            revision: '',
            skema: skema,
            status: '',
            underprojektediteret: '',
            underprojektrevision: '',
            underprojektstatus: ''
        };
    }

    async getProjectAsync(projektId, projektData) {

        if (!projektId) {
            console.error("No projektId provided");
            return;
        }
        const data = await this.fetchDataAsync(`/api/extension/mapstatus/GetProject/${projektId}`);
        if (data && data.features && data.features.length > 0) {
            Object.assign(projektData, data.features[0].properties);
            projektData.editdate = data.features[0].properties.editeret;

        }

        return projektData;
    }

    async saveProjectMetaAsync(projektData) {
        try {

            const projectBody = {
                ...projektData,
            };

            const url = projektData.id == 0 ? `/api/extension/mapstatus/createproject/` : `/api/extension/mapstatus/saveproject/`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (e) {
            console.error("Error in saveProjectMetaAsync:", e);
            return {};
        }
    }

    // gem hele projektet ekskl. geojson
    async saveProjectAsync(skema, projektData) {
        try {

            const projectBody = {
                ...projektData,
                skema: skema,
                geojson: this._geojson // overskriv geojson
            };
            const url = `/api/extension/mapstatus/saveproject/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectBody)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (e) {
            console.error("Error in saveProjectAsync:", e);
            return {};
        }
    }


}