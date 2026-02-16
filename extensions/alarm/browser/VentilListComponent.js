"use strict";
var React = require("react");
var dict = require("./i18n.js");

class VentilListComponent extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }
    __ = (txt) => {
        if (dict[txt][window._vidiLocale]) {
            return dict[txt][window._vidiLocale];
        } else {
            return txt;
        }
    }

    render() {
        const {
            clickedTableVentil,
            onDownloadVentiler,
            onVentilZoom,
            ventilList,
            onRunWithoutSelected,
            onHandleVentilCheckbox,
            retryIsDisabled } = this.props;


        return (
             <details open  className="col">
                <summary>{this.__("Valves")} ({ventilList.length})</summary>
                <div className="row mx-auto gap-1 my-2" style={{ maxHeight: '175px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <table className="table table-sm mb-0 col-11">
                        <thead style={{ fontWeight: 'bold', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ width: '10px' }}>
                                </th>
                                <th><p style={{ fontWeight: 500 }}>Navn</p></th>
                                <th><p style={{ fontWeight: 500 }}>Type</p></th>
                                <th><p style={{ fontWeight: 500 }}>Funktion</p></ th>
                                <th style={{ verticalAlign: 'text-top' }} >
                                    <i className="bi bi-download "
                                     onClick={onDownloadVentiler}
                                     style={{ pointer: 'cursor' }}
                                     title={this.__("Download valves")}>
                                   </i>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventilList.map((ventil) => {
                                const bg = ventil.label === clickedTableVentil ? 'table-primary' : 'table-light';
                                const textColor = ventil.textColor;
                                const ventilIsDisabled = ventil.ventilIsDisabled;
                                const ventilTitle = ventil.ventilTooltip
                                const ventilCursor = ventil.ventilCursor;
                                return (<tr key={ventil.value} className={bg} title={ventilTitle} >
                                    {/* 1 Checkbox */}
                                    <td>
                                        <input
                                            checked={ventil.checked}
                                            disabled={ventilIsDisabled}
                                            className="form-check-input"
                                            id={`ventil-checkbox-${ventil.value}`}
                                            onChange={(event) => onHandleVentilCheckbox(event, ventil)}
                                            style={{ cursor: ventilCursor }}
                                            title={ventilTitle}
                                            type="checkbox"
                                            value={ventil.value}
                                        />
                                    </td>
                                    {/* 2 Label */}
                                    <td>
                                        <label
                                            className="form-check-label"
                                            htmlFor={`ventil-checkbox-${ventil.value}`}
                                            style={{ cursor: 'pointer', color: textColor }}
                                        >
                                            {ventil.label}
                                        </label>
                                    </td>
                                    {/* 3 Type */}
                                    <td>
                                        <label style={{ color: textColor }}>
                                            {ventil.type}
                                        </label>
                                    </td>
                                    {/* 4 Funtion */}
                                    <td>
                                        <label style={{ color: textColor }}>
                                            {ventil.funktion}
                                        </label>
                                    </td>

                                    {/* 5 Zoom icon */}
                                    <td style={{ textAlign: 'center' }}>
                                        <i
                                            className="bi bi-zoom-in"
                                            onClick={onVentilZoom.bind(this, ventil)}
                                            style={{ cursor: 'pointer' }}
                                            title="Zoom til ventil"
                                        >
                                        </i>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="form-text">{this.__("Select one or more valves")}</div>
                <div className="row mx-auto gap-0 my-3">
                    <button
                        className="btn btn-primary col"
                        disabled={retryIsDisabled}
                        onClick={onRunWithoutSelected.bind(this)}
                        title={this.__("Retry tooltip")}
                    >
                        {this.__("Retry with unaccessible valves")}
                    </button>
                </div>
           </details>
            
        );
    }

}
export default VentilListComponent;