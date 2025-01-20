import React from "react";
import * as GQL from "src/core/generated-graphql";
import { Button, Modal } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { performerMutationImpactedQueries, queryFindTagsByIDForSelect } from "src/core/StashService";
interface IProps {
    scene: GQL.SceneDataFragment;
}

export const PerformerButtons: React.FC<IProps> = ({
    scene,
}) => {
    const cWidth = "200px"
    const iWidth = "calc(200px - .75rem)"
    const iHeight = "240px"
    const PerfContent = scene.performers.map( (performer) => {
        function maybeRenderAltImage() {
            const {data} = GQL.useFindImagesQuery({variables: {
                image_filter: {
                    performers: {
                        modifier: GQL.CriterionModifier.Includes,
                        value: [performer.id]
                    },
                    tags: {
                        modifier: GQL.CriterionModifier.Includes,
                        value: ["1736"]
                    }
                }
            }})

            // console.info(data?.findImages)

            return data?.findImages.count != 0 ? data?.findImages.images[0].paths.image : performer.image_path
        }
        return (
            <>
            <div className="" key={performer.id} style={{
            width: cWidth,
            }}>
            <Link
            to={`/performers/${performer.id}?sortby=random`}
            style={{
                display: "flex",
                flexDirection: "column",
                // width: "fit-content",
                padding: "0 .75rem",
                overflow: "hidden",
                paddingBottom: "0.25rem",
                textDecoration: "none",
                color: "#fff"
            }}
            >
            <div style={{
            height: iHeight,
            width: iWidth,
            overflow: "hidden",
            borderRadius: ".5rem",
            }}>
                <img
                className="performer"
                style={{
                    height: "auto",
                    width: "100%",
                }}
                src={maybeRenderAltImage() ?? ""}
                >
                </img>
            </div>
            <span
                style={{
                    textAlign: "center"
                }}
            >
                {performer.name}
            </span>
            </Link>
            </div>
            </>
    )
    })
    return (
        <>
                {PerfContent}     
        </>
    );
}