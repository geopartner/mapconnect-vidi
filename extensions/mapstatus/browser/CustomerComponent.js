/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";

class CustomerComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            createCustomer: false,
            kunder: [],

            aktivkundeid: 0,
            newKundeId: "",
        }
    }

    componentDidMount() {
        this.setState({ aktivkundeid: this.props.activeProject?.kundeid || 0 });
        this.setState({ createCustomer: this.props?.createCustomer || false });
        fetch('/api/extension/mapstatus/GetKunder')
            .then(response => response.json())
            .then(data => {

                const result = data.features.map(feature => ({
                    id: feature.properties.id,
                    navn: feature.properties.kundenavn
                }))

                this.setState({ kunder: result });
            })
            .catch(error => {
                console.error('Error fetching customers:', error);
            });

    }
    handleSelectChange = (event) => {
        this.setState({ aktivkundeid: event.target.value });
    };

    handleInputChange = (event) => {
        this.setState({ newKundeId: event.target.value });
    };

    handleAddValue = () => {
        const trimmed = this.state.newValue.trim();
        if (trimmed && !this.state.options.includes(trimmed)) {
            this.setState((prevState) => ({
                options: [...prevState.options, trimmed],
                selected: trimmed,
                newValue: "",
            }));
        }
    };
    render() {
        return (
            <div>
                <div className="row mb-2">
                    <label htmlFor="kunde-select" style={{ fontWeight: "bold" }} className="col-4" >Kunde</label>
                    <select
                        className="col-7"
                        id="kunde-select"
                        value={this.props.activeProject?.kundeid || ''}
                        onChange={this.handleSelectChange}
                    >
                        <option value="">Vælg kunde</option>
                        {this.state.kunder.map((kunde) => (
                            <option key={kunde.id} value={kunde.id}>
                                {kunde.navn}
                            </option>
                        ))}
                    </select>

                    {this.state.createCustomer && (
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control"
                                value={this.state.newKundeId}
                                placeholder="Tilføj ny kunde..."
                                onChange={this.handleInputChange}
                            />
                            <button
                                className="btn btn-primary"
                                type="button"
                                onClick={this.handleAddValue}
                                disabled={!this.state.newKundeId.trim()}
                            >                 
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
export default CustomerComponent;