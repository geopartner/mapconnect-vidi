/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";

class EditDialog extends React.Component {
    constructor(props) {
        super(props);
    }
    
    onBemChange = (value) => {
        const { feature } = this.props;
        feature.properties.bem = value;
        this.setState({ feature });
    }

    render() {
        const {
            feature,
            onDataChanged

        } = this.props;
        return (
            <div style={{
                ...styles.overlay,
                left: this.props.mouseClickXY.x + 'px',
                top: `${this.props.mouseClickXY.y - 100}px`,
            }} >
                <textarea autoFocus
                    onChange={(e) => this.onBemChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && e.shiftKey) {
                         return; 
                       }
                        if ( e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault()
                            onDataChanged(feature.properties.id, feature.properties.bem.trim(), true);
                        }

                    }}
                    value={feature.properties.bem}
                    className="w-100"
                    placeholder="Bemærkning"
                    title="Bemærkning"
                />
            </div>
        );
    }
}
const styles = {
    overlay: {
        position: 'fixed',
        resize: 'both',
        overflow: 'auto',
        display: 'flex',
        transform: 'translate(-50%, -50%)',
        width: '100px',
        height: '100px',
        backgroundColor: 'grey',
        border: '1px solid #ccc',
        borderRadius: '4px',
        zIndex: 10202
    }
};
export default EditDialog;
