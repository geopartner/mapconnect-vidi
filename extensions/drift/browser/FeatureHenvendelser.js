/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";
import Henvendelse from "../manager/Henvendelse.js";

class FeatureHenvendelser extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            henvendelser: [],
            pagination: null,
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
            this.setState({ henvendelser: [], pagination: null });
            return;
        }
        this.setState({ loading: true, error: null });
        const henvendelser = await featuresManager.getHenvendelser();
        this.setState({
            henvendelser: featuresManager.getCurrentPage(),
            pagination: featuresManager.getPagination(),
            loading: false,
            error: henvendelser === null ? "Kunne ikke hente henvendelser" : null,
        });
    };

    updatePage = (action) => {
        const featuresManager = this.props.featuresManager;
        if (!featuresManager) {
            return;
        }
        this.setState({
            henvendelser: action(featuresManager),
            pagination: featuresManager.getPagination(),
        });
    };

    renderPagination() {
        const p = this.state.pagination;
        if (!p) {
            return null;
        }
        const isFirst = p.page === 0;
        const isLast = p.page >= p.pageCount - 1;
        const pageButton = (label, title, disabled, action) => (
            <li className={`page-item${disabled ? " disabled" : ""}`}>
                <button type="button" className="page-link" title={title} disabled={disabled} onClick={() => this.updatePage(action)}>
                    {label}
                </button>
            </li>
        );

        return (
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <ul className="pagination pagination-sm mb-0">
                    {pageButton("\u00ab", "Første", isFirst, (m) => m.firstPage())}
                    {pageButton("\u2039", "Forrige", isFirst, (m) => m.prevPage())}
                    <li className="page-item disabled">
                        <span className="page-link">Side {p.page + 1} af {p.pageCount}</span>
                    </li>
                    {pageButton("\u203a", "Næste", isLast, (m) => m.nextPage())}
                    {pageButton("\u00bb", "Sidste", isLast, (m) => m.lastPage())}
                </ul>
                <div className="d-flex align-items-center gap-1">
                    <small className="text-nowrap">{p.from}-{p.to} af {p.total}</small>
                    <select
                        className="form-select form-select-sm w-auto"
                        title="Rækker pr. side"
                        value={p.pageSize}
                        onChange={(e) => {
                            const size = e.target.value;
                            this.updatePage((m) => m.setPageSize(size));
                        }}
                    >
                        {p.pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                </div>
            </div>
        );
    }

    render() {
        const { henvendelser, loading, error } = this.state;
        const columns = Henvendelse.tableColumns;

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
                                {columns.map((col) => <th key={col.key}>{col.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {henvendelser.map((henvendelse, index) => {
                                const row = henvendelse.toTableRow();
                                return (
                                <tr key={henvendelse.gid ?? index}>
                                    {columns.map(({ key }) => (
                                        <td visible={!!row[key]} key={key}>{String(row[key] ?? "")}</td>
                                    ))}
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {!loading && henvendelser.length > 0 && this.renderPagination()}
            </div>
        );
    }
}

export default FeatureHenvendelser;
