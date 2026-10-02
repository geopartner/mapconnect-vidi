/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";

class FeatureHenvendelser extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            henvendelser: [],
            loading: false,
            error: null,
        };
    }

    componentDidMount() {
        this.loadHenvendelser();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.featuresManager !== this.props.featuresManager) {
            this.loadHenvendelser();
        }
    }

    loadHenvendelser = async () => {
        const featuresManager = this.props.featuresManager;
        if (!featuresManager) {
            this.setState({ henvendelser: [] });
            return;
        }
        this.setState({ loading: true, error: null });
        const henvendelser = await featuresManager.getHenvendelser();
        if (henvendelser === null) {
            this.setState({ henvendelser: [], loading: false, error: "Kunne ikke hente henvendelser" });
        } else {
            this.setState({ henvendelser: henvendelser || [], loading: false });
        }
    };

    render() {
        const { henvendelser, loading, error } = this.state;
        const columns = henvendelser.length > 0 ? Object.keys(henvendelser[0]) : [];

        return (
            <div>
                <div className="d-flex justify-content-end mb-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={this.loadHenvendelser} disabled={loading}>
                        Opdater
                    </button>
                    {this.props.onClose && (
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={this.props.onClose}>
                            Luk
                        </button>
                    )}
                </div>

                {loading && <div><span className="spinner-border spinner-border-sm"></span> Henter henvendelser...</div>}
                {error && <div className="alert alert-danger">{error}</div>}
                {!loading && !error && henvendelser.length === 0 && <div>Ingen henvendelser fundet</div>}

                {!loading && henvendelser.length > 0 && (
                    <table className="table table-sm table-striped table-hover">
                        <thead>
                            <tr>
                                {columns.map((col) => <th key={col}>{col}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {henvendelser.map((henvendelse, index) => (
                                <tr key={henvendelse.id ?? index}>
                                    {columns.map((col) => (
                                        <td key={col}>
                                            {henvendelse[col] !== null && typeof henvendelse[col] === "object"
                                                ? JSON.stringify(henvendelse[col])
                                                : String(henvendelse[col] ?? "")}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    }
}

export default FeatureHenvendelser;
