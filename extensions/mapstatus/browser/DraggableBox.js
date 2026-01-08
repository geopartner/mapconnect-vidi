/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";
import { max } from "underscore";


class DraggableBox extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            dragInfo: {
                x: 100,
                y: 100,
                offsetX: 0,
                offsetY: 0
            },
            isDragging: false,
            isResizing: false,

        };
        this.isUserResizing = false;
        this.boxRef = React.createRef();
    }

    componentDidMount() {
        this.setState({ isResizing: false });
        this.setState({ isDragging: false });
    }

    componentWillUnmount() {

    }

    handleMouseDown = (e) => {
        const rect = this.boxRef.current.getBoundingClientRect();
        const childrenNode = this.boxRef.current.querySelector(".draggable-children");
        if (childrenNode && childrenNode.contains(e.target)) {
            document.body.style.cursor = "grab";
            return;
        }

        const cornerSize = 32; // hvor stort område i hjørnet der gælder som resize
        const isInCorner = (e.clientX >= rect.right - cornerSize) && (e.clientY >= rect.bottom - cornerSize);


        this.isUserResizing = isInCorner;
        this.setState({ isResizing: isInCorner });

        this.setState({
            isDragging: true,
            dragInfo: {
                ...this.state.dragInfo,
                offsetX: e.clientX - rect.left,
                offsetY: e.clientY - rect.top,
                x: rect.left,
                y: rect.top
            }

        });
        document.body.style.cursor = isInCorner ? "nwse-resize" : "pointer"; // resize-cursor
        window.addEventListener("mousemove", this.handleMouseMove);
        window.addEventListener("mouseup", this.handleMouseUp);
    }

    handleMouseUp = () => {
        this.setState({ isDragging: false });
        this.setState({ isResizing: false });
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("mouseup", this.handleMouseUp);
    }

    handleMouseMove = (e) => {
        if (this.state.isResizing) return;
        if (e.clientX < 0 || e.clientY < 40) return;
        if (e.clientX > window.innerWidth || e.clientY > window.innerHeight) return;

        this.setState({
            dragInfo: {
                ...this.state.dragInfo,
                x: e.clientX - this.state.dragInfo.offsetX,
                y: e.clientY - this.state.dragInfo.offsetY
            }
        });
        if (this.boxRef.current) {
            this.boxRef.current.style.position = 'absolute';
            this.boxRef.current.style.left = `${this.state.dragInfo.x}px`;
            this.boxRef.current.style.top = `${this.state.dragInfo.y}px`;
            this.boxRef.current.style.cursor = 'move';
        }
    }


    render() {
        const {
            children,
            headerText,
            onExcel } = this.props;

        return (
            <div className="form-select mb-3" onMouseDown={this.handleMouseDown}
                style={{
                    backgroundColor: '#fff',
                    border: '1px solid #000',
                    bottom: '10px',
                    cursor: 'move',
                    display: 'flex',
                    flexDirection: "column",
                    fontSize: '12px',
                    height: '650px',
                    margin: '10px',
                    maxHeight: '650px',
                    padding: '5px',
                    overflow: 'hidden',
                    position: 'fixed',
                    right: '75px',
                    resize: 'both',
                    userSelect: 'none',
                    width: '70vw',
                    zIndex: 10200
                }}
                ref={this.boxRef}
            >
                <div className="border-bottom border-2 form-select" style={{ minHeight: '45px', maxHeight: '45px', overflowY: 'hidden', overflowX: 'hidden' }}>
                    <div className="row">
                        <div className="col-md-12  background-light mb-2 ">
                            <h5 className="mb-2 mr-2">{headerText}</h5>
                        </div>
                    </div>
                </div>
                <div className="draggable-children">
                    {children}
                </div>
            </div>
        );
    }
}

export default DraggableBox;
