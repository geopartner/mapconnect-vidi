/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";

class ExcelExport extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const { onClickExportExcel } = this.props  ;
        return (
            <div title="Hent tilbudslisten for valgte underprojekt.">
                <button
                    onClick={onClickExportExcel}
                    className="btn btn-primary ml-2 text-end"
                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', borderRadius: '0.2rem' }}
                >
                    <i className="bi bi-save me-2"></i>Excel
                </button>
            </div>
        );
    }
}

export default ExcelExport;