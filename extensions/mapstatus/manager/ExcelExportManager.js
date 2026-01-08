/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

export default class ExcelExportManager {
    constructor(activeProject,nodeManager, pipeManager) {
        this.activeProject = activeProject;
        this.nodeManager = nodeManager;
        this.pipeManager = pipeManager; 
        this.filename = activeProject.navn.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '_');
        /*********************************************************************************************************************  
         *  Det er valgt at hårdkode kolonneoverskrifterne i stedet for at hente dem fra geojson filen aht. projektet omfang. * 
         *  Det vil sige at hvis kolonner ændres, fjernes eller tilføjes skal det rettes både her og i FeatureTable.js        *
         *  og FeatureTableNode.js                                                                                            *
         **********************************************************************************************************************/
  
        this.headers = [
            'Opstr.',
            'Dybde opstr.',
            'Nedstr.',
            'Dybde nedstr.',
            'System',
            'Kategori',
            'Materiale',
            'Rør diameter',
            'Længde',
            'Fra kote',
            'Til kote',
            'Fysisk indeks',
            'Metode',
            'Terræn',
            'Antal stik',
            'Bemærkning'
        ];
        this.headersNode = [
            'Brønd',
            'System',
            'Kategori',
            'Type',
            'Dimension',
            'Materiale', 
            'Dybde',
            'Metode',
            'Terræn',
            'Bemærkning'
        ];
    }
    nodeData() {
       const rows = this.nodeManager.getFeatures()
            .filter(f => f.properties.isSelected === true)
            .map(f => ({
                [this.headersNode[0]]: f.properties.knudenavn,
                [this.headersNode[1]]: f.properties.system,
                [this.headersNode[2]]: f.properties.kategori,
                [this.headersNode[3]]: f.properties.knudetype,
                [this.headersNode[4]]: f.properties.dimension,
                [this.headersNode[5]]: f.properties.brøndmateriale,
                [this.headersNode[6]]: f.properties.dybde,
                [this.headersNode[7]]: f.properties.metode,
                [this.headersNode[8]]: f.properties.terraen,
                [this.headersNode[9]]: f.properties.bem
            }));
        return rows;    
    }

    pipeData() {
        const rows = this.pipeManager.getFeatures()
            .filter(f => f.properties.isSelected === true)
            .map(f => ({
                [this.headers[0]]: f.properties.fra_brønd,
                [this.headers[1]]: f.properties.fra_broend_dybde,
                [this.headers[2]]: f.properties.til_brønd,
                [this.headers[3]]: f.properties.til_broend_dybde,
                [this.headers[4]]: f.properties.system,
                [this.headers[5]]: f.properties.kategori,
                [this.headers[6]]: f.properties.materiale,
                [this.headers[7]]: f.properties.handelsmål,
                [this.headers[8]]: f.properties.længde,
                [this.headers[9]]: f.properties.fra_kote,
                [this.headers[10]]: f.properties.til_kote,
                [this.headers[11]]: f.properties.fysiskindeks,
                [this.headers[12]]: f.properties.metode,
                [this.headers[13]]: f.properties.terraen,
                [this.headers[14]]: f.properties.antalstik_ledning,
                [this.headers[15]]: f.properties.bem
            }));
        return rows;
    }
        
    buildExcelData(kundenavn) {
        return {
            afdeling: this.activeProject.afdeling,
            beskrivelse: this.activeProject.beskrivelse,
            bygherreadresse: this.activeProject.bygherreadresse,
            bygherreafdeling: this.activeProject.bygherreafdeling,
            bygherrenavn: this.activeProject.bygherrenavn,
            bygherrepostnr: this.activeProject.bygherrepostnr,
            editeret: this.activeProject.editeret,
            kundeid: this.activeProject.kundeid,
            kundeNavn: this.activeProject.kundeNavn || kundenavn,
            navn: this.activeProject.navn,
            oprettet: this.activeProject.oprettet,
            projektadresse: this.activeProject.projektadresse,
            projektnavn: this.activeProject.projektnavn,
            projektpostnr: this.activeProject.projektpostnr ,
            revision: this.activeProject.revision || '',
            status: this.activeProject.status,
            underprojektstatus: this.activeProject.underprojektstatus || '',
            underprojektediteret: this.activeProject.underprojektediteret|| '',
            underprojektrevision: this.activeProject.underprojektrevision || '',
            rows: this.pipeData(),           
            rowsNode: this.nodeData(),
            headers: this.headers,
            headersNode: this.headersNode,
            filename: this.filename
        };
    }

    downloadExcel(kundenavn) {
        try {
            const projectInfo = this.buildExcelData(kundenavn);
            if (!projectInfo || !projectInfo.rows || projectInfo.rows.length === 0) {
                alert("Der er ingen data at eksportere til Excel.");
                return;
            }
            const urlExcel = `/api/extension/mapstatus/buildexcel/`;
            fetch(urlExcel, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectInfo)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    if (!blob || blob.size === 0) {
                        console.error("Received empty blob from server");
                        alert("Der opstod en fejl under eksport af data til Excel. Se konsollen for detaljer.");
                        return;
                    }
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${projectInfo.filename || 'projekt'}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                })
                .catch(e => {
                    console.error("Error in downloadExcel: ", e);
                    alert("Der opstod en fejl under eksport af data til Excel. Se konsollen for detaljer.");
                });
        }
        catch (e) {
            console.error("Error in downloadExcel: ", e);
            alert("Der opstod en fejl under eksport af data til Excel. Se konsollen for detaljer.");
        }
    }

}
