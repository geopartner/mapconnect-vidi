/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import { Minimize } from "@material-ui/icons";
import { toPathSchema } from "@rjsf/utils";
import React from "react";
import { max } from "underscore";


class DraggableBox extends React.Component {
    
    static defaultProps = {
        initialStyle: {
            bottom: '10px',
            height: '650px',
            maxHeight: '650px',
            right: '75px',
            width: '1200px'
        },
        minimizedStyle : {
            bottom: '10px',
            height: '80px',
            maxHeight: '80px',
            right: '75px',
            width: '1200px'
        }       
    };
    
    
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
            isMaximized: true

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
        const maximized = this.state.isMaximized;
        const {
            children,
            headerText,
            initialStyle,
            showMinimizeButton,
            minimizedStyle } = this.props;
     
        const baseStyle = {
            backgroundColor: '#fff',
            border: '1px solid #000',
            cursor: 'move',
            display: 'flex',
            flexDirection: "column",
            fontSize: '12px',
            margin: '10px',
            padding: '5px',
            overflow: 'hidden', 
            position: 'absolute',
            resize: 'both',
            userSelect: 'none',
            zIndex: 10200
        };
        const activeStyle = maximized ? initialStyle : minimizedStyle;    
        return (
            <div onMouseDown={this.handleMouseDown}
               style={{
                ...baseStyle,
                ...activeStyle
                }}
                ref={this.boxRef}
            >   
                <div className="border-bottom border-2 row" style={{ minHeight: '30px', maxHeight: '30px', overflowY: 'hidden', overflowX: 'hidden' }}>
                    <div className="col-11">
                        <h6>{headerText}</h6>   
                    </div>
                    
                    <div className="col-1" style={{cursor: 'pointer'}}>
                        <i className="bi bi-dash me-2 window-icon" title="maksimer"  hidden={!showMinimizeButton} onClick={() => this.setState({ isMaximized: false })} ></i>
                        <i className="bi bi-square window-icon" title="minimer" hidden={!showMinimizeButton} onClick={() => this.setState({ isMaximized: true })}  ></i>
                    </div>
                </div>
                <div className="draggable-children">
                 {maximized && children }
                </div>
            </div>
        );
    }
}

export default DraggableBox;
