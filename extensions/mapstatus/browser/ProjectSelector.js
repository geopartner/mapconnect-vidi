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
                        <div className="mb-3 align-items-center">
                            <label htmlFor="project-select" className="form-label fw-bold">Underprojekt</label>
                            <select
                                id="project-select"
                                className="form-select"
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
                        <div className="row mb-3 align-items-center">
                            {isProjectSelected && (
                                <ExcelExport onClickExportExcel={this.props.onClickExportExcel} />
                            )}
                        </div>
                    </>
                )}
            </>
        );
    }
}

export default ProjectSelector;
