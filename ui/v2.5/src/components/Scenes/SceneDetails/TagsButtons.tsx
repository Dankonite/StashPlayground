import React from "react";
import * as GQL from "src/core/generated-graphql";
import { Button, Modal } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { queryFindTagsByIDForSelect } from "src/core/StashService";
import { TagLink } from "src/components/Shared/TagLink";
interface IProps {
    scene: GQL.SceneDataFragment;
}

export const TagButtons: React.FC<IProps> = ({
    scene,
}) => {
    const ids: string[] = []
    function sortBySceneCount( a:any, b:any ){
        if ( a.scene_count_all < b.scene_count_all ){
            return 1;
          }
        if ( a.scene_count_all > b.scene_count_all ){
        return -1;
        }
        return 0;
    }
    scene.tags.forEach((tag) => {ids.push(tag.id)})
    // console.info(ids)
    const {data} = GQL.useFindTagsQuery({variables: {ids: ids}})
    // console.info(data?.findTags.tags)
    const tagsSorted = data?.findTags.tags.map((tag) => tag).sort(sortBySceneCount)
    // console.info(tagsSorted)
    const tagContent = tagsSorted?.map( (tag) => (
            <>
            <div className="h-fc" key={tag.id}>
            <Link
            to={`/tags/${tag.id}?sortby=random`}
            className="mb-2 mr-2 justify-content-center d-flex flex-column w-fc"
            style={{
                padding: "0 .75rem",
                paddingBottom: "0.25rem",
                textDecoration: "none",
                color: "#fff",
                borderRadius: ".2rem",
                backgroundColor: "#202020",
            }}
            >
            <span
                style={{
                    textAlign: "center",
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
                {tagContent}     
        </>
    );
}