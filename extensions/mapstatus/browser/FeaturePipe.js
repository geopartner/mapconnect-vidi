/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";
import PipeMethodComponent from "./PipeMethodComponent.js";
import PipeTerrainComponent from "./PipeTerrainComponent.js";
import UrlDialog from "./UrlDialog.js";


const MAPSTATUS_MODULE_NAME = `mapstatus`;
class FeaturePipe extends React.Component {
    constructor(props) {
        super(props);
        this.state = {  
            showModal: false,
            urlDialog: null,
            bem: props?.feature?.properties?.bem || ""
        };  
    }

     componentDidMount() {
        this.setState({ bem: this.props?.feature?.properties?.bem || "" });
    }

    handleVideoLink = (id) => {
        const skema = this.props.skema;
        this.props.featuresManager?.getLedningFilmfilAsync(skema, id)
            .then((url) => {
                if (url) {
                    this.setState({ urlDialog: url });
                    // window.open(url, '_blank');
                } else {
                    alert("Ingen video fundet for denne ledning.");
                }
            })
            .catch((error) => {
                console.error("Error fetching video link:", error);
                alert("Fejl ved hentning af video link: " + error.message);
            });
    };

    handlePdfLink = (id) => {
        const skema = this.props.skema;
        this.props.featuresManager?.getLedningRapportnrAsync(skema, id)
            .then((url) => {
                if (url) {
                    this.setState({ urlDialog: url, showModal: true });
                } else {
                    alert("Ingen PDF fundet for denne ledning.");
                }
            })
            .catch((error) => {
                console.error("Error fetching PDF link:", error);
                alert("Fejl ved hentning af PDF link: " + error.message);
            });
    };

    updateData = () => {
        const skema = this.props.skema
        this.props.featuresManager?.saveFeatureAsync(skema, this.props.activeProject);
        this.forceUpdate();
    };

  
    setBemChange = (bem) => {
        this.setState({ bem: bem });
    }

    render() {
        const  { feature } = this.props;
        const {
            fra_brønd, 
            fra_broend_dybde, 
            til_brønd,  
            til_broend_dybde, 
            system, 
            kategori, 
            materiale, 
            handelsmål, 
            længde, 
            fra_kote, 
            til_kote, 
            fysiskindeks, 
            metode,    
            terraen,
            antalstik_ledning,
            ledningid,
            bem
             } = feature.properties;
        
        let bemark = this.state.bem; 
        
        return(<>
           
            {this.state.urlDialog && (
                <UrlDialog
                    url={this.state.urlDialog}
                    onClose={() => this.setState({ urlDialog: '' })}
                >  </UrlDialog>)
            }           
            <div style={{ padding: '10px' }}>
            <div className="d-flex gap-3">
                <div className="flex-grow-1">
                    <p><strong>Fra brønd:</strong> {fra_brønd}</p>
                    <p><strong>Fra brønd dybde:</strong> {fra_broend_dybde} m</p>
                    <p><strong>Fra kote:</strong> {fra_kote} m</p>
                    <p><strong>Handelsmål:</strong> {handelsmål} mm</p>
                    
                    <p><strong>System:</strong> {system}</p>
                    <p><strong>Kategori:</strong> {kategori}</p>
                    <p><strong>Materiale:</strong> {materiale}</p>
                    <div> 
                        <p><strong>Metode:</strong></p> 
                        <PipeMethodComponent 
                           onChange={(e) => {
                            feature.properties.metode = e.target.value;;
                            this.updateData();
                        }}
                        selected={metode} 
                        />
                    
                    </div>
                </div>
                <div className="flex-grow-1">
                    <p><strong>Til brønd:</strong> {til_brønd}</p>
                    <p><strong>Til brønd dybde:</strong> {til_broend_dybde} m</p>
                    <p><strong>Til kote:</strong> {til_kote} m</p>
                    <p><strong>Længde:</strong> {længde} m</p>
                    <p><strong>Fysisk indeks:</strong> {fysiskindeks}</p>
                    <p><strong>Antal stik:</strong> {antalstik_ledning}</p>
                    <p>&nbsp;</p>
                    <div> 
                     <p><strong>Terræn:</strong></p> 
                     <PipeTerrainComponent 
                        onChange={(e) => {
                            feature.properties.terraen = e.target.value;;
                            this.updateData();
                        }} 
                        selected={terraen}
                       />
                    </div>    
                   
                </div>      
            </div>

            <div className="mb-2">
                <p className="mb-2"><strong>Bemærkninger:</strong></p>
                <textarea 
                    className="form-control w-100"
                    rows="4"
                    value={bemark}
                    onChange={(e) => this.setState({ bem: e.target.value })}  
                    onBlur={() => {
                        feature.properties.bem = this.state.bem;
                        this.updateData();
                    }}  
                   /> 
            </div>
            <div className="d-flex gap-2 mt-3">
                <button className="btn btn-secondary" onClick={() => this.handleVideoLink(ledningid)}>Video</button>
                <button className="btn btn-secondary" onClick={() => this.handlePdfLink(ledningid)}>Rapport</button>
                <button className="btn btn-primary ms-auto" onClick={() => this.props.onClose()}>Luk</button>
            </div>
        </div>
    </>);
    }
};
export  default FeaturePipe;