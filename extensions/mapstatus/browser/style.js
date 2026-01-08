/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

const styleObject = {

    modalOverlay: {
        position: 'fixed',
        zIndex: 10201,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
    },

    modalContent: {
        background: 'white',
        padding: '20px',
        margin: '10% auto',
        width: '400px',
        borderRadius: '8px'
    },
    resizableContainer: {
      overflowY: 'auto',
      flex: 1,
      cursor: 'pointer'
    },
    tableContainer: {
        border: '1px solid #ccc',
        borderRadius: '4px',
        maxHeight: '400px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
       
    },
    
    innerTableContainer: {
      flex: 1,
      overflowY: 'auto',
      minHeight: 0
    },

    tableHeader: {
        backgroundColor: '#d3d3d3',
        fontWeight: 'bold',
        position: 'sticky',
        top: 0
    },

    tableHeaderSmall: {
        backgroundColor: '#d3d3d3',
        fontWeight: 'bold',
        position: 'sticky',
        top: 0,
        width: '20px'
    },

    tableStyle: {
        width: '100%',
        borderCollapse: 'collapse',
        // tableLayout: 'fixed',
    },

    headerRow: {
        borderBottom: '2px solid #000',
    },

    tbodyStyle: {
        maxHeight: '300px',
        overflowY: 'auto',
        width: '100%',
    },


    cellStyleHeader: {
        width: '100%',
        fontWeight: 'bold !important',
    },
    cellStyleLongText: {
        overflowWrap: 'break-word'
    },

    cellStyleLongTextBold: {
        overflowWrap: 'break-word',
        fontWeight: 'bold'
    },

    modalDialog: {
        display: 'block',
        paddingLeft: '0'
    },

    formDialog : {
        '--bs-form-select-bg-img': 'none',
    }


};
module.exports = styleObject;