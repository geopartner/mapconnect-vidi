/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";
import PipeMethodComponent from "./PipeMethodComponent.js";
import PipeTerrainComponent from "./PipeTerrainComponent.js";
import UrlDialog from "./UrlDialog.js";

class FeatureNode extends React.Component {
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


    handlePdfLink = (knudenavn) => {
        const skema = this.props.skema;
        this.props.featuresManager?.getBroendRapportnrAsync(skema, knudenavn)
            .then((url) => {
                if (url) {
                    this.setState({ urlDialog: url,showModal: true });
                } else {
                    alert("Ingen PDF fundet for denne brønd.");
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
            knudenavn,
            system,
            kategori,
            knudetype,
            dimension,
            brøndmateriale,
            dybde,
            metode,
            terraen,
            bem
             } = feature.properties;
        
        let bemark = this.state.bem; 
        
        return (
             <>
                {this.state.urlDialog && (
                    <UrlDialog
                        url={this.state.urlDialog}
                        onClose={() => this.setState({ urlDialog: '' })}
                    >  </UrlDialog>)
                }
            <div style={{ height: '550px', width: '350px', padding: '10px', margin: '10px' }}>
            <div className="row">
                <div className="col">
                    <p><strong>Brønd:</strong> {knudenavn}</p>
                    <p><strong>Kategori:</strong> {kategori}</p>
                    <p><strong>Dimension:</strong> {dimension} m</p>
                    <p><strong>Dybde:</strong> {dybde} m</p>
                    
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
                <div className="col">
                    <p><strong>System:</strong> {system }</p>
                    <p><strong>Type:</strong> {knudetype}</p>
                    <p><strong>Materiale:</strong> {brøndmateriale}</p>
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

            <div className="row">
                <div className="col-12">
                    <p><strong>Bemærkninger:</strong></p>
                </div>
            </div>
            <div className="row">
                <div className="col-12">
                    <textarea 
                    rows="4" 
                    cols="50" 
                    value={bemark}
                    onChange={(e) => this.setState({ bem: e.target.value })}  
                    onBlur={() => {
                        feature.properties.bem = this.state.bem;
                        this.updateData();
                    }}  
                   /> 
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <button className="btn btn-secondary" onClick={() => this.handlePdfLink(knudenavn)}>Rapport</button>
                </div>
                <div className="col">
                    <button className="btn btn-secondary" onClick={() => this.props.onClose()}>Luk</button>
                </div>
            </div>
            
            
        </div>;
        </>)
    }
};
export  default FeatureNode;