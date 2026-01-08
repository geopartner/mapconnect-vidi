/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";

class PipeTerrainComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            terrains: [
                '',
                'Uoplyst',
                'Asfalt',
                'Belægningssten',
                //  'Betonfliser', dandas standard, men ikke i brug efter aftale med bodum afh forsimpling af valg og overskuelighed
                // 'Brolægning',
                'Buskads',
                'Fortovsfliser',
                'Grus',
                'Græs',
                // 'Græsarmering',
                // 'Kantsten',
                // 'Træer',
                'Andet'],
            selectedMetode: this.props.selected

        }
    }

    componentDidMount() {

    }

    handleChange = (event) => {
        this.setState({ selectedMetode: event.target.value });
         if (this.props.onChange) {
           this.props.onChange(event);
        }
    };

    render() {
        const showAdd = this.props.showAdd;
        const onAddMetode = this.props.onAddMetode;
        const { selectedMetode } = this.state;
        const selected  = this.props.selected; 
        return (
            <div className="d-flex flex-wrap align-items-center gap-2">
                {showAdd && (
                    <button
                        className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                        onClick={() => onAddMetode(selectedMetode)}
                        title="Tildel terræn til valgte ledninger" >
                        <i className="bi bi-plus"></i>
                    </button>
                )}
                <select
                    className="form-select form-select-sm w-auto"
                    style={{ maxWidth: "120px"}}
                    value={selected}
                    onChange={this.handleChange}
                >
                    {this.state.terrains.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                    ))}
                </select>

            </div>
        );
    }
}
export default PipeTerrainComponent;