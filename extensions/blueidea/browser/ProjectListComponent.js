"use strict";
var React = require("react");
var dict = require("./i18n.js");


class ProjectListComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clickedTableProjectIndex: -1
    }
  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  zoomToProject( rowIndex, properties ) {
    this.setState({ clickedTableProjectIndex: rowIndex });
    this.props.onHandleZoomProject(properties.xmin, properties.ymin, properties.xmax, properties.ymax );
  }

  handleRowClick(rowIndex, properties) {
    this.zoomToProject(rowIndex, properties);
  }

  handleEditProject(rowIndex, properties) {
    this.zoomToProject(rowIndex, properties);
    this.props.onHandleEditProject(properties.beregnuuid);
  }
  handleStopProject(rowIndex, properties) {
    this.setState({ clickedTableProjectIndex: rowIndex });
    this.props.onHandleStopProject(properties);
  }

  toDateTimeLocal(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  __ = (txt) => {
    if (dict[txt][window._vidiLocale]) {
      return dict[txt][window._vidiLocale];
    } else {
      return txt;
    }
  }

  render() {
    const { projects } = this.props;
    const { clickedTableProjectIndex } = this.state;
    const noProjects = projects.length === 0;
    return (
      <>
        {noProjects && (
          <div className="row mx-auto gap-0 my-3">
            <h6 className="col">Ingen aktive brud</h6>
          </div>
        )}

        {!noProjects && (
          <>
            <div className="row mx-auto g-3 my-3 border rounded" style={{ maxHeight: '175px', overflowY: 'auto' }}>
              <table className="table table-sm mb-0 col">
                <thead style={{ fontWeight: 'bold', position: 'sticky', top: 0 }}>
                  <tr>
                    <th></th>
                    <th><span className="fw-medium d-block">Navn</span></th>
                    <th><span className="fw-medium d-block">Type</span></th>
                    <th><span className="fw-medium d-block">Start</span></th>
                    <th><span className="fw-medium d-block">Slut</span></th>
                    {/* <th></th> */}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((option, rowIndex) => {
                    const bg = clickedTableProjectIndex === rowIndex ? 'table-primary' : 'table';
                    const fromDate = this.toDateTimeLocal(option.properties.gyldig_fra);
                    const toDate = this.toDateTimeLocal(option.properties.gyldig_til);
                    const brudType = String(option.properties.beregnaarsag) === '1'  ? 'Akut' : 'Planlagt';
                    return (<tr key={option.properties.beregnuuid} className={bg} style={{ cursor: 'pointer' }} onClick={() => this.handleRowClick(rowIndex, option.properties)}>
                      <td style={{ textAlign: 'center' }}>
                        <i
                          className="bi bi-pencil"
                          onClick={() => this.handleEditProject(rowIndex, option.properties)}
                          style={{ cursor: 'pointer' }}
                          title="Rediger brud"
                        >
                        </i>
                      </td>

                      <td>
                        <span>
                          {option.properties.sagstekst}
                        </span>
                      </td>
                      <td>
                        <span>
                          {brudType}
                        </span>
                      </td>

                      <td>
                        <span>
                          {fromDate}
                        </span>
                      </td>

                      <td>
                        <span>
                          {toDate}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <i
                          className="bi bi-trash"
                          onClick={(e) => { e.stopPropagation(); this.handleStopProject(rowIndex, option.properties);}}
                          style={{ cursor: 'pointer' }}
                          title="Gør bruddet inaktivt"
                        >
                        </i>
                      </td>

                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

      </>
    )
  }
}
export default ProjectListComponent;
