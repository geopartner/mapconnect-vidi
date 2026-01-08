/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";
import ExcelExport from "./ExcelExport.js";
class ProjectSelector extends React.Component {
    render() {
        const {
            projects,
            selectedProject,
            onSelectChange,
            isProjectSelected,
        } = this.props;


        return (
            <>
                {Object.entries(projects).length > 0 && (
                    <>
                        <div className="row mb-1">
                            <p className="fw-bold col-4">Underprojekt</p>
                            <select
                                className="col-7"
                                value={selectedProject?.id}
                                onChange={(e) => onSelectChange(e.target.value, true)}>
                                {projects.map((option, index) => (
                                    <option
                                        key={index}
                                        value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="row mb-1">
                            <div className="col-4"></div>
                            <div className="col-7" >
                                {isProjectSelected && (
                                    <ExcelExport onClickExportExcel={this.props.onClickExportExcel} />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </>
        );
    }
}

export default ProjectSelector;
