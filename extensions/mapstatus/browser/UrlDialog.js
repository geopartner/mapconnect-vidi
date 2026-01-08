/*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2025 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

import React from "react";

class UrlDialog extends React.Component {
    render() {
        const { url, onClose } = this.props;
        const isPdf = url.toLowerCase().includes(".pdf");
        const isVideo = url.toLowerCase().includes(".mp4") || url.toLowerCase().includes(".mpeg") || url.toLowerCase().includes(".mpg");
        const parsed = URL.parse(url);
        const filename = parsed.pathname.split('/').pop();
        return (
            <div style={styles.overlay}>

                <div style={styles.dialog}>
                    <h2 className="text-center mb-2">{filename}</h2>
                    <button onClick={onClose} style={styles.closeButton}>×</button>

                    {isPdf && (
                        <embed
                            src={url}
                            type="application/pdf"
                            width="100%"
                            height="100%"
                            style={styles.content}
                        />
                    )}

                    {isVideo && (
                        <video controls style={styles.content}>
                            <source src={url}
                            />
                            Din browser understøtter ikke videoafspilning.
                        </video>
                    )}

                    {!isPdf && !isVideo && (
                        <div style={styles.content}>
                            <p>Ukendt filtype: <code>{url}</code></p>
                        </div>
                    )}

                    <div className="text-center mt-2">
                        <button className="btn btn-primary" onClick={onClose}  >Luk</button>
                    </div>
                </div>

            </div>
        );
    }
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10202
    },
    dialog: {
        position: 'relative',
        backgroundColor: 'white',
        width: '80%',
        height: '70%',
        minWidth: '300px',
        minHeight: '300px',
        maxWidth: '95%',
        maxHeight: '90%',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        resize: 'both',
        overflow: 'auto'  // vigtigt for at kunne scrolles ved mindre størrelse
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        fontSize: '1.5rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
    },
    content: {
        flex: 1,
        border: '1px solid #ccc',
        borderRadius: '4px',
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    }
};

export default UrlDialog;
