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
    handleRowClick (rowIndex) {
      this.setState({clickedTableProjectIndex: rowIndex});
    }
 
    toDateTimeLocal(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const pad = n => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    
    __ = (txt) => {
      if (dict[txt][window._vidiLocale]) {
        return dict[txt][window._vidiLocale];
      } else {
        return txt;
      }
    }

    render() {
      const {onHandleZoomProject,onHandleStopProject, projects, user_udpeg_layer}   = this.props;
      const {clickedTableProjectIndex} = this.state;
      const noProjects = projects.length ===0;
      return (
        <>
          {noProjects && (
            <div className="row mx-auto gap-0 my-3">
              <h6 className="col">Ingen aktive brud</h6>       
            </div>
          )}

          {!noProjects&& (
            <>
               {/* <div className="row">
                <h6 className="col">Aktive brud</h6>       
              </div> */}
              <div className="row mx-auto gap-3 my-3" style={{ maxHeight: '175px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
                <table className="table table-sm mb-0 col">
                  <thead  style={{fontWeight: 'bold', position: 'sticky',top: 0}}>
                    <tr>
                      <th></th>                    
                      <th><p style={{fontWeight:500, marginBottom: '4px', padding:'2px'}}>Navn</p></th>
                      <th><p style={{fontWeight:500, marginBottom: '4px', padding:'2px'}}>Type</p> </th>
                      <th><p style={{fontWeight:500, marginBottom: '4px', padding:'2px'}}>Start</p></th>
                      <th><p style={{fontWeight:500, marginBottom: '4px', padding:'2px'}}>Slut</p></th>
                      {/* <th></th> */}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((option, rowIndex) => {
                      const bg =  clickedTableProjectIndex === rowIndex ? 'table-primary': 'table-light';
                      const fromDate = this.toDateTimeLocal(option.properties.gyldig_fra);
                      const toDate = this.toDateTimeLocal(option.properties.gyldig_til);
                      const brudType = option.properties.brudtype ==='Aktuel afbrydelse' ? 'Akut' :'Planlagt';
                      return (<tr key={option.properties.beregnuuid} className={bg} onClick={() => this.handleRowClick(rowIndex)}>
                        <td style={{ textAlign: 'center' }}>
                          <i
                            className="bi bi-zoom-in"
                                  onClick={() => onHandleZoomProject(option.properties.xmin, option.properties.ymin, option.properties.xmax, option.properties.ymax )}
                                  style={{ cursor: 'pointer' }}
                                  title="Zoom til projekt"
                          >
                          </i>
                        </td>

                        <td>
                          <label
                            className="form-check-label">
                            {option.properties.sagstekst}
                          </label>
                        </td>
                        <td>
                          <label
                            className="form-check-label">
                            {brudType}
                          </label>
                        </td>
                                
                        <td>
                          <label>
                            {fromDate}
                          </label>
                        </td>

                        <td>
                          <label>
                            {toDate}
                          </label>
                        </td>

                        {/* <td style={{ textAlign: 'center' }}>
                          <i
                            className="bi bi-pencil"
                            disabled={true}
                            onClick={() => onHandleZoomProject(option.properties.x, option.properties.y, user_udpeg_layer )}
                            style={{ cursor: 'pointer' }}
                            title="Rediger projekt"
                          >
                          </i>
                        </td> */}
                        <td style={{ textAlign: 'center' }}>
                          <i
                            className="bi bi-trash"
                            onClick={() => onHandleStopProject(option.properties.beregnuuid )}
                            style={{ cursor: 'pointer' }}
                            title="Afslut brud"
                          >
                          </i>
                        </td>

                      </tr>
                    )})}
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
