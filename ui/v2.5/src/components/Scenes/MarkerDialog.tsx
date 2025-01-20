import React from "react";
import * as GQL from "src/core/generated-graphql";
import { Button, Modal } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import TextUtils from "src/utils/text";
interface IProps {
    scene: GQL.SlimSceneDataFragment;
    onCancel: () => void; 
}
export const MarkerDialog: React.FC<IProps> = ({
    scene,
    onCancel,
}) => {
    const { data, loading, error } = GQL.useFindSceneQuery({
        variables: {
           id: scene.id
        },
      });


    const markerContent = data?.findScene?.scene_markers.map((marker) => (
        <div>
            <Link
            to={`/scenes/${marker.scene.id}?t=${marker.seconds}`}
            style={{
                display: "flex",
                flexDirection: "column",
                width: "fit-content",
                padding: "0 .75rem",
                paddingBottom: "0.25rem",
                textDecoration: "none",
                color: "#fff"
            }}
            >
            <img
                style={{
                    height: "100px",
                    aspectRatio: "auto",
                    borderRadius: ".75rem",
                }}
                src={marker.preview}
            >
            </img>
            <span
                style={{
                    textAlign: "center"
                }}
            >
                {marker.title ? marker.title : marker.primary_tag.name}
            </span>
            <span
                style={{
                textAlign: "center"
            }}
            >
                {TextUtils.secondsToTimestamp(marker.seconds)}
            </span>
            </Link>
        </div>
    ))
    return (
        <>
        <Modal show onHide={() => onCancel()} className="marker-dialog">
            <Modal.Header style={{
                borderTopLeftRadius: "1rem",
                borderTopRightRadius: "1rem"
            }}>
                <div>
                    Markers
                </div>
                <Button variant="secondary" onClick={() => onCancel()}>
                    <FormattedMessage id="actions.close" />
                </Button>
            </Modal.Header>
            <Modal.Body>
            <div
            key={scene.id}
            style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
            }}
            >
                {markerContent}
            </div>
            </Modal.Body>
            <Modal.Footer style={{
                borderBottomLeftRadius: "1rem",
                borderBottomRightRadius: "1rem"
            }}>
                <Button variant="secondary" onClick={() => onCancel()}>
                    <FormattedMessage id="actions.close" />
                </Button>
            </Modal.Footer>
        </Modal>
        </>
    );
}