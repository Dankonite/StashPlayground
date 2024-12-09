import React from "react";
import * as GQL from "src/core/generated-graphql";
import { Button, Modal } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { queryFindTagsByIDForSelect } from "src/core/StashService";
interface IProps {
    scene: GQL.SlimSceneDataFragment;
    onCancel: () => void;
}

export const TagDialog: React.FC<IProps> = ({
    scene,
    onCancel,
}) => {
    const ids: string[] = []
    scene.tags.forEach((tag) => {ids.push(tag.id)})
    // console.info(ids)
    const {data} = GQL.useFindTagsQuery({variables: {ids: ids}})
    // console.info(data?.findTags.tags)
    const tagContent = data?.findTags.tags.map( (tag) => (
            <>
            <div className="TagDialog" key={tag.id}>
            <Link
            to={`/tags/${tag.id}?sortby=random`}
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
                    height: "120px",
                    aspectRatio: "auto",
                    borderRadius: ".75rem",
                }}
                src={tag.image_path ?? ""}
            >
            </img>
            <span
                style={{
                    textAlign: "center"
                }}
            >
                {tag.name}
            </span>
            </Link>
            </div>
            </>
    ))
    return (
        <>
        <Modal show onHide={() => onCancel()} className="tags-dialog" style={{
            maxHeight: "90vh",
            height: "fit-content"
        }}>
            <Modal.Header style={{
                borderTopLeftRadius: "1rem",
                borderTopRightRadius: "1rem"
            }}>
                <div>
                    Tags
                </div>
                <Button variant="secondary" onClick={() => onCancel()}>
                    <FormattedMessage id="actions.close" />
                </Button>
            </Modal.Header>
            <Modal.Body style={{
                overflowY: "scroll",
                maxHeight: "75vh",
                height: "fit-content"
            }}>
            <div
            key={scene.id}
            style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
            }}
            >
                {tagContent}     
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