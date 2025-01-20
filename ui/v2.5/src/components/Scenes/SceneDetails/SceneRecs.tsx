import React, { useEffect, useState } from "react";
import { RecommendsGrid } from "src/components/Recommendations/RecommendsGrid";
import * as GQL from "src/core/generated-graphql";
import { RecommendsCol } from "./RecommendsGrid";
import { remove } from "lodash-es";
import { Button } from "react-bootstrap";
import { MarkerWallPanel } from "src/components/Wall/WallPanel copy";
import { useStats } from "src/core/StashService";
import { TypeKind } from "graphql";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
interface IProps {
    scene: GQL.SceneDataFragment;
    queue: JSX.Element
}
interface markersProps {
scene:GQL.SceneDataFragment
}

const MarkerView: React.FC<markersProps> = ({
    scene,
}) => {
    const { data, loading } = GQL.useFindSceneMarkerTagsQuery({
        variables: { id: scene.id },
        });
    const sceneMarkers = (
        data?.sceneMarkerTags.map((tag) => tag.scene_markers) ?? []
        ).reduce((prev, current) => [...prev, ...current], []);
    const markers = 
        <MarkerWallPanel
        markers={sceneMarkers}
        clickHandler={(e, marker) => {
        e.preventDefault();
        window.scrollTo(0, 0);
        }}
        />
return (
    <>{markers}</>
)
}
export const SceneRecs: React.FC<IProps> = ({
    scene,
    queue
}) => {
    const totalSceneCount = useStats().data?.stats.scene_count
    const thisScenesPerf:string[] = scene.performers.map((perf) => perf.id)
    const thisScenesTags:string[] = scene.tags.map((tag) => tag.id)
    const scenesFound: GQL.SlimSceneDataFragment[] = []
    var lastwatchedperformers:string[] = []
    function queryCheck() {
        const {data, loading} = GQL.useFindScenesQuery({
            variables: {
                filter: {
                    sort: "random",
                    per_page: 1, 
                },
                scene_filter: {
                    tags: {
                        value: thisScenesTags,
                        modifier: GQL.CriterionModifier.Includes,
                    }
                }
            }
        })
        if (data?.findScenes.scenes) scenesFound.push.apply(scenesFound, data?.findScenes.scenes)
        // // console.info(data?.findScenes.scenes.length)
    }
    queryCheck()
    function checkRw() {
        var {data} = GQL.useFindScenesQuery({
            variables: {
                filter: {
                    per_page: 30,
                    sort: "last_played_at",
                    direction: GQL.SortDirectionEnum.Desc
                }
            }
        })
        data?.findScenes.scenes.map((scene) => {
            if (scene.performers.length < 4) scene.performers.map((performer) => {
                if (performer.gender === "FEMALE") lastwatchedperformers.push(performer.id)
            })
            
        })
        return data
    }
    const scenesRw = checkRw()
    const tagsRw:string[] = []
        scenesRw?.findScenes.scenes.map((scene) => {
            scene.tags.map((tag) => tagsRw.push(tag.id))
        })
    const studiosRW:string[] = []
        scenesRw?.findScenes.scenes.map((s) => {
            if (s.studio) studiosRW.push(s.studio.id)
            return
        })
    function getAllTagsBySceneCount() {
        var {data} = GQL.useFindTagsQuery({
            variables: {
                filter: {
                    per_page: -1,
                    sort: "scenes_count",
                    direction: GQL.SortDirectionEnum.Asc
                }
            }
        })
        return data ? data : undefined
    }
    const allTags = getAllTagsBySceneCount()
    const countObject = (array:string[], item:string) => {
        return array.filter((currentItem) => currentItem == item).length;
    }
    function isNotNull(value:any) {
        return value != ""
    }
    function isNotUndef(value:any) {
        return value != undefined
    }
    const tagScores = allTags?.findTags.tags.map((tag) => {
        return {
            tag: tag,
            score: countObject(tagsRw, tag.id)/10 + 2 * countObject(thisScenesTags, tag.id) // max of 2 points for the first thing based on recent 2 points for matching a tag on this scene
        }
    }).filter(isNotUndef)
    function sortScenes( a:any, b:any ){
        if ( a.score < b.score ){
            return 1;
          }
        if ( a.score > b.score ){
        return -1;
        }
        return 0;
    }
    function getAllScenesToCheck() {
        if (scenesFound.length > 0 && tagScores?.length) {
            const sceneWscores = scenesFound.map((scene) => calcScenesScore(scene)).sort(sortScenes)
            const scenes = sceneWscores.map((item) => item.scene)
            const sceneIds = scenes.map((item) => item.id)
            scenes.splice(sceneIds.indexOf(scene.id), 1)
            // console.info(sceneWscores)
            // console.info(scenes)
            return scenes.slice(0,10)
        }
    }
    
    function calcScenesScore(sceneTC:GQL.SlimSceneDataFragment) {
        var score = 0
        const Tscores = sceneTC.tags.map((tag) => tagScores![tagScores!.findIndex(x => x?.tag.id === tag.id)]?.score).filter(isNotUndef)
        Tscores.map((scoreItem) => score = score + scoreItem!)       // Adds score for every matching tag (0-4 range) 2 based on tags freq in rwScenes; 2 based on matching a tag on this scene (having LOTS of tags can skew toward tag matching)
        if (sceneTC.studio && scene.studio) {                       // Adds 4 to the score if SceneTC's Studio Matches the current video
            if (sceneTC.studio.id == scene.studio.id) {
                score = score + 6
            }
        }
        if (sceneTC.studio) { // Adds 1 score each time sceneTC's studio appeared in RW Studios (0-15 possible if you are only watching one specific studio consistently/mostly it will weight heavier)
            score = score + countObject(studiosRW, sceneTC.studio.id)
            // console.info(countObject(studiosRW, sceneTC.studio.id))
        }
        if (sceneTC.performers.length > 0) {
            sceneTC.performers.map((perf) => score = score + 2 * countObject(lastwatchedperformers, perf.id)) // 2 score for count of performer in last watched performers (0-60 per perfomrer depending on freq in RW)
            sceneTC.performers.map((perf) => score = score + 4 * countObject(thisScenesPerf, perf.id)) // 4 score for mathing a performer on this scene
        }
        if (score > 15) {
            // console.info(sceneTC.title + " " + score)
        }
        score = score * (.85 + (Math.random() * .3)) // multiplies final scores by (.85-1.15) to make it a little more random
        return {
            scene: sceneTC,
            score: score,
        }
    }
    function recommendedContent() {
        const content = 
            <RecommendsCol
                key={Math.random()}
                scenes={getAllScenesToCheck()}
                />
        return content
    }
    function markers() {
        const content =
        <MarkerView scene={scene}/>
        return content
    }
    const [isRecommended, setIsRecommended] = useState(true)
    const [isMarkers, setIsMarkers] = useState(false)
    const [isQueue, setIsQueue] = useState(false)
    const recContent = recommendedContent()
    const markerContent = markers()
    function render() {
        var content = isRecommended ? recContent
                    : isQueue ? queue
                    : isMarkers ? markerContent
                    : undefined
        
        const display = 
        <>
            <div className="d-flex flex-row ml-1 mb-2" key={Math.random()}>

                <Button 
                className={`${isRecommended ? "btn-dc" : "btn-secondary"} btn-1l`}
                onClick={() => {
                    setIsMarkers(false)
                    setIsRecommended(true)
                    setIsQueue(false)
                }}
                >
                Recommended
                </Button>
                <div className="flex-grow-1"></div>
                <Button 
                className={`${isQueue ? "btn-dc" : "btn-secondary"} btn-1l`}
                onClick={() => {
                    setIsMarkers(false)
                    setIsRecommended(false)
                    setIsQueue(true)
                }}
                >
                Queue
                </Button>
                {scene.scene_markers.length > 0 ? <Button 
                className={`${isMarkers ? "btn-dc" : "btn-secondary"} btn-1l`}
                onClick={() => {
                    setIsMarkers(true)
                    setIsRecommended(false)
                    setIsQueue(false)
                }}
                >
                Markers
                </Button> : <></>}
            </div>
            {content ? content : <LoadingIndicator />}
            
        </>
        return content ? display : null
    }
    
    
    return render()
}