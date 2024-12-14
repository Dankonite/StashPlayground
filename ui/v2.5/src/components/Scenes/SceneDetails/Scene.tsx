import { Tab, Nav, Dropdown, Button, ButtonGroup, Modal } from "react-bootstrap";
import React, {
  useEffect,
  useState,
  useMemo,
  useContext,
  useRef,
  useLayoutEffect,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, RouteComponentProps, useHistory } from "react-router-dom";
import { Helmet } from "react-helmet";
import * as GQL from "src/core/generated-graphql";
import {
  mutateMetadataScan,
  useFindScene,
  useSceneIncrementO,
  useSceneDecrementO,
  useSceneResetO,
  useSceneGenerateScreenshot,
  useSceneUpdate,
  queryFindScenes,
  queryFindScenesByID,
} from "src/core/StashService";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

import { CriterionModifier } from "src/core/generated-graphql";
import { useFindImagesQuery } from "src/core/generated-graphql";
import { useGalleryLightbox } from "src/hooks/Lightbox/hooks";
import { SceneEditPanel } from "./SceneEditPanel";
import { ErrorMessage } from "src/components/Shared/ErrorMessage";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { Icon } from "src/components/Shared/Icon";
import { Counter } from "src/components/Shared/Counter";
import { useToast } from "src/hooks/Toast";
import SceneQueue, { QueuedScene } from "src/models/sceneQueue";
import { ListFilterModel } from "src/models/list-filter/filter";
import Mousetrap from "mousetrap";
import { OCounterButton } from "./OCounterButton";
import { OrganizedButton } from "./OrganizedButton";
import { ConfigurationContext } from "src/hooks/Config";
import { getPlayerPosition } from "src/components/ScenePlayer/util";
import {
  faEllipsisV,
  faChevronRight,
  faChevronLeft,
  faLightbulb,
  faArrowsLeftRightToLine,
  faImage,
  faX,
  faPlay,
  faDownload,
  faArrowLeft,
  faCamera,
  faMapPin,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import { lazyComponent } from "src/utils/lazyComponent";
import PerformerPill from "./PerformerPill";

const SubmitStashBoxDraft = lazyComponent(
  () => import("src/components/Dialogs/SubmitDraft")
);
const ScenePlayer = lazyComponent(
  () => import("src/components/ScenePlayer/ScenePlayer")
);

const GalleryViewer = lazyComponent(
  () => import("src/components/Galleries/GalleryViewer")
);
const ExternalPlayerButton = lazyComponent(
  () => import("./ExternalPlayerButton")
);

const QueueViewer = lazyComponent(() => import("./QueueViewer"));
const SceneMarkersPanel = lazyComponent(() => import("./SceneMarkersPanel"));
const SceneFileInfoPanel = lazyComponent(() => import("./SceneFileInfoPanel"));
const SceneDetailPanel = lazyComponent(() => import("./SceneDetailPanel"));
const SceneHistoryPanel = lazyComponent(() => import("./SceneHistoryPanel"));
const SceneGroupPanel = lazyComponent(() => import("./SceneGroupPanel"));
const SceneGalleriesPanel = lazyComponent(
  () => import("./SceneGalleriesPanel")
);
const DeleteScenesDialog = lazyComponent(() => import("../DeleteScenesDialog"));
const GenerateDialog = lazyComponent(
  () => import("../../Dialogs/GenerateDialog")
);
const SceneVideoFilterPanel = lazyComponent(
  () => import("./SceneVideoFilterPanel")
);
import { objectPath, objectTitle } from "src/core/files";
import { RatingSystem } from "src/components/Shared/Rating/RatingSystem";
import { TagButtons } from "./TagsButtons";
import { PerformerButtons } from "./PerformerButtons";
import { SceneRecs } from "./SceneRecs";
import TextUtils from "src/utils/text";
import cx from "classnames";
import { sortPerformers } from "src/core/performers";
import { HoverPopover } from "src/components/Shared/HoverPopover";
import { SceneMarkerForm } from "./SceneMarkerForm";
import VerticalScenePlayer from "src/components/ScenePlayer/VerticalScenePlayer";
import { GroupCard } from "src/components/Groups/GroupCard";

interface Oprops {
  scene: GQL.SceneDataFragment
}
export const PerformerNameButton: React.FC<Oprops> = ({scene}) => {
  const sorted = sortPerformers(scene.performers);
  var l = 0

  const ulstyle = {
    listStyle: "none",
    padding: "0",
    margin: "0",
    
  }
  const listyle = {
    display: "inline",
    fontSize: "1.3em"
  }
  const perfFavorite = {
    color: "#FFCE45",
    display: "inline",
    fontSize: "1.3em"
  }
  const perfImage = {
    height: "200px",
    borderRadius: ".75rem"
  }
  const popoverTest = (
    <ul className="comma-list overflowable" style={ulstyle}>
      {sorted.map((performer) => (
        <li key={performer.id} style={listyle} >
          <HoverPopover
            className="performer-image d-inline"
            placement="top"
            enterDelay={600}
            content={
                      <Link
                        to={`/performers/${performer.id}`}
                      >
                        <img 
                          src={performer.image_path ?? ""}
                          alt={performer.name ?? ""}
                          style={perfImage}>
                        </img>
                      </Link>
                    }
          >
          <Link
          to={`/performers/${performer.id}`}
          >
          {performer.favorite ? <span style={perfFavorite}>{performer.name}</span> : <span>{performer.name}</span>}
          </Link>
          </HoverPopover>
        </li>
      ))}
    </ul>
  )
  return (
  <div className="perfname-list">
        {popoverTest}
  </div>
  );
};
interface IScenePreviewProps {
  isPortrait: boolean;
  image?: string;
  video?: string;
  soundActive: boolean;
  vttPath?: string;
  onScrubberClick?: (timestamp: number, scene: GQL.SlimSceneDataFragment) => void;
}
export const ScenePreview: React.FC<IScenePreviewProps> = ({
  image,
  video,
  isPortrait,
  soundActive,
}) => {
  const videoEl = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio > 0)
          // Catch is necessary due to DOMException if user hovers before clicking on page
          videoEl.current?.play()?.catch(() => {});
        else videoEl.current?.pause();
      });
    });

    if (videoEl.current) observer.observe(videoEl.current);
  });

  useEffect(() => {
    if (videoEl?.current?.volume)
      videoEl.current.volume = soundActive ? 0.05 : 0;
  }, [soundActive]);

  return (
    <div>
      <div className={cx("scene-card-preview", { portrait: isPortrait })}>
        <img
          className="scene-card-preview-image"
          loading="lazy"
          src={image}
          alt=""
        />
        <video
          disableRemotePlayback
          playsInline
          muted={!soundActive}
          className="scene-card-preview-video"
          loop
          preload="none"
          ref={videoEl}
          src={video}
        />
      </div>
    </div>
  );
};
interface UBarProps {
  scene: GQL.SceneDataFragment;
  setEditMode: () => void;
}
interface ISceneParams {
  id: string;
}

interface IProps {
  classFake: string;
  scene: GQL.SceneDataFragment;
  setTimestamp: (num: number) => void;
  queueScenes: QueuedScene[];
  onQueueNext: () => void;
  onQueuePrevious: () => void;
  onQueueRandom: () => void;
  onQueueSceneClicked: (sceneID: string) => void;
  onDelete: () => void;
  continuePlaylist: boolean;
  queueHasMoreScenes: boolean;
  onQueueMoreScenes: () => void;
  onQueueLessScenes: () => void;
  queueStart: number;
  collapsed: boolean;
  editFirst?: boolean;
  setCollapsed: (state: boolean) => void;
  setContinuePlaylist: (value: boolean) => void;
}
const ScenePage: React.FC<IProps> = ({
  classFake,
  scene,
  setTimestamp,
  queueScenes,
  onQueueNext,
  onQueuePrevious,
  onQueueRandom,
  onQueueSceneClicked,
  onDelete,
  continuePlaylist,
  queueHasMoreScenes,
  onQueueMoreScenes,
  onQueueLessScenes,
  queueStart,
  collapsed,
  editFirst,
  setCollapsed,
  setContinuePlaylist,
}) => {
  const Toast = useToast();
  const intl = useIntl();
  const [updateScene] = useSceneUpdate();
  const [generateScreenshot] = useSceneGenerateScreenshot();
  const { configuration } = useContext(ConfigurationContext);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const boxes = configuration?.general?.stashBoxes ?? [];

  const [incrementO] = useSceneIncrementO(scene.id);
  const [decrementO] = useSceneDecrementO(scene.id);
  const [resetO] = useSceneResetO(scene.id);

  const [organizedLoading, setOrganizedLoading] = useState(false);

  const [activeTabKey, setActiveTabKey] = useState(editFirst ? "scene-edit-panel" : "scene-details-panel");

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  const onIncrementClick = async () => {
    try {
      await incrementO();
    } catch (e) {
      Toast.error(e);
    }
  };

  function setRating(v: number | null) {
    updateScene({
      variables: {
        input: {
          id: scene.id,
          rating100: v,
        },
      },
    });
  }

  const onDecrementClick = async () => {
    try {
      await decrementO();
    } catch (e) {
      Toast.error(e);
    }
  };

  // set up hotkeys
  useEffect(() => {
    Mousetrap.bind(",", () => setCollapsed(!collapsed));

    return () => {
      Mousetrap.unbind(",");
    };
  });

  async function onSave(input: GQL.SceneCreateInput) {
    await updateScene({
      variables: {
        input: {
          id: scene.id,
          ...input,
        },
      },
    });
    Toast.success(
      intl.formatMessage(
        { id: "toast.updated_entity" },
        { entity: intl.formatMessage({ id: "scene" }).toLocaleLowerCase() }
      )
    );
  }

  const onOrganizedClick = async () => {
    try {
      setOrganizedLoading(true);
      await updateScene({
        variables: {
          input: {
            id: scene.id,
            organized: !scene.organized,
          },
        },
      });
    } catch (e) {
      Toast.error(e);
    } finally {
      setOrganizedLoading(false);
    }
  };

  const onResetClick = async () => {
    try {
      await resetO();
    } catch (e) {
      Toast.error(e);
    }
  };

  function onClickMarker(marker: GQL.SceneMarkerDataFragment) {
    setTimestamp(marker.seconds);
  }

  async function onRescan() {
    await mutateMetadataScan({
      paths: [objectPath(scene)],
    });

    Toast.success(
      intl.formatMessage(
        { id: "toast.rescanning_entity" },
        {
          count: 1,
          singularEntity: intl
            .formatMessage({ id: "scene" })
            .toLocaleLowerCase(),
        }
      )
    );
  }

  async function onGenerateScreenshot(at?: number) {
    await generateScreenshot({
      variables: {
        id: scene.id,
        at,
      },
    });
    Toast.success(intl.formatMessage({ id: "toast.generating_screenshot" }));
  }

  function onDeleteDialogClosed(deleted: boolean) {
    setIsDeleteAlertOpen(false);
    if (deleted) {
      onDelete();
    }
  }

  function maybeRenderDeleteDialog() {
    if (isDeleteAlertOpen) {
      return (
        <DeleteScenesDialog selected={[scene]} onClose={onDeleteDialogClosed} />
      );
    }
  }

  function maybeRenderSceneGenerateDialog() {
    if (isGenerateDialogOpen) {
      return (
        <GenerateDialog
          selectedIds={[scene.id]}
          onClose={() => {
            setIsGenerateDialogOpen(false);
          }}
          type="scene"
        />
      );
    }
  }
  const downloadStream = (url: string) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderOperations = () => (
    <Dropdown>
      <Dropdown.Toggle
        variant="secondary"
        id="operation-menu"
        className="minimal"
        title={intl.formatMessage({ id: "operations" })}
      >
        <Icon icon={faEllipsisV} />
      </Dropdown.Toggle>
      <Dropdown.Menu className="bg-secondary text-white">
        {!!scene.files.length && (
          <Dropdown.Item
            key="rescan"
            className="bg-secondary text-white"
            onClick={() => onRescan()}
          >
            <FormattedMessage id="actions.rescan" />
          </Dropdown.Item>
        )}
        <Dropdown.Item
          key="generate"
          className="bg-secondary text-white"
          onClick={() => setIsGenerateDialogOpen(true)}
        >
          <FormattedMessage id="actions.generate" />
        </Dropdown.Item>
        <Dropdown.Item
          key="generate-screenshot"
          className="bg-secondary text-white"
          onClick={() => onGenerateScreenshot(getPlayerPosition())}
        >
          <FormattedMessage id="actions.generate_thumb_from_current" />
        </Dropdown.Item>
        <Dropdown.Item
          key="generate-default"
          className="bg-secondary text-white"
          onClick={() => onGenerateScreenshot()}
        >
          <FormattedMessage id="actions.generate_thumb_default" />
        </Dropdown.Item>
        {boxes.length > 0 && (
          <Dropdown.Item
            key="submit"
            className="bg-secondary text-white"
            onClick={() => setShowDraftModal(true)}
          >
            <FormattedMessage id="actions.submit_stash_box" />
          </Dropdown.Item>
        )}
        <Dropdown.Item
          key="delete-scene"
          className="bg-secondary text-white"
          onClick={() => setIsDeleteAlertOpen(true)}
        >
          <FormattedMessage
            id="actions.delete_entity"
            values={{ entityType: intl.formatMessage({ id: "scene" }) }}
            />
          </Dropdown.Item>
          <Dropdown.Item
            key="download"
            className="bg-secondary text-white"
            onClick={() => {
              const directStream = scene.sceneStreams.find(stream => stream.label === "Direct stream");
              if (directStream) {
                downloadStream(directStream.url);
              }
            }}
          >
            <FormattedMessage
              id="actions.download"
            values={{ entityType: intl.formatMessage({ id: "scene" }) }}
          />
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );

  const renderTabs = () => (
    <Tab.Container
      activeKey={activeTabKey}
      onSelect={(k) => k && setActiveTabKey(k)}
    >
      <div>
        <Nav variant="tabs" className="mr-auto">
          <Nav.Item>
            <Nav.Link eventKey="scene-details-panel">
              <FormattedMessage id="details" />
            </Nav.Link>
          </Nav.Item>
          {queueScenes.length > 0 ? (
            <Nav.Item>
              <Nav.Link eventKey="scene-queue-panel">
                <FormattedMessage id="queue" />
              </Nav.Link>
            </Nav.Item>
          ) : (
            ""
          )}
          <Nav.Item>
            <Nav.Link eventKey="scene-markers-panel">
              <FormattedMessage id="markers" />
            </Nav.Link>
          </Nav.Item>
          {scene.groups.length > 0 ? (
            <Nav.Item>
              <Nav.Link eventKey="scene-group-panel">
                <FormattedMessage
                  id="countables.groups"
                  values={{ count: scene.groups.length }}
                />
              </Nav.Link>
            </Nav.Item>
          ) : (
            ""
          )}
          {scene.galleries.length >= 1 ? (
            <Nav.Item>
              <Nav.Link eventKey="scene-galleries-panel">
                <FormattedMessage
                  id="countables.galleries"
                  values={{ count: scene.galleries.length }}
                />
              </Nav.Link>
            </Nav.Item>
          ) : undefined}
          <Nav.Item>
            <Nav.Link eventKey="scene-video-filter-panel">
              <FormattedMessage id="effect_filters.name" />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="scene-file-info-panel">
              <FormattedMessage id="file_info" />
              <Counter count={scene.files.length} hideZero hideOne />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="scene-history-panel">
              <FormattedMessage id="history" />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="scene-edit-panel">
              <FormattedMessage id="actions.edit" />
            </Nav.Link>
          </Nav.Item>
          <ButtonGroup className="ml-auto">
            <Nav.Item className="ml-auto">
              <ExternalPlayerButton scene={scene} />
            </Nav.Item>
            <Nav.Item className="ml-auto">
            <RatingSystem
                value={scene.rating100}
                onSetRating={setRating}
                clickToRate
                withoutContext
              />
            </Nav.Item>
            {/* <Nav.Item className="ml-auto">
              <OCounterButton
                value={scene.o_counter || 0}
                onIncrement={onIncrementClick}
                onDecrement={onDecrementClick}
                onReset={onResetClick}
              />
            </Nav.Item> */}
            <Nav.Item className="ml-auto">
              <ExternalPlayerButton scene={scene} />
            </Nav.Item>
            <Nav.Item>
              <OrganizedButton
                loading={organizedLoading}
                organized={scene.organized}
                onClick={onOrganizedClick}
              />
            </Nav.Item>
            <Nav.Item>{renderOperations()}</Nav.Item>
          </ButtonGroup>
        </Nav>
      </div>

      <Tab.Content>
        <Tab.Pane eventKey="scene-details-panel">
          <SceneDetailPanel scene={scene} />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-queue-panel">
          <QueueViewer
            scenes={queueScenes}
            currentID={scene.id}
            continue={continuePlaylist}
            setContinue={setContinuePlaylist}
            onSceneClicked={onQueueSceneClicked}
            onNext={onQueueNext}
            onPrevious={onQueuePrevious}
            onRandom={onQueueRandom}
            start={queueStart}
            hasMoreScenes={queueHasMoreScenes}
            onLessScenes={onQueueLessScenes}
            onMoreScenes={onQueueMoreScenes}
          />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-markers-panel">
          <SceneMarkersPanel
            sceneId={scene.id}
            onClickMarker={onClickMarker}
            isVisible={activeTabKey === "scene-markers-panel"}
          />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-group-panel">
          <SceneGroupPanel scene={scene} />
        </Tab.Pane>
        {scene.galleries.length >= 1 && (
          <Tab.Pane eventKey="scene-galleries-panel">
            <SceneGalleriesPanel galleries={scene.galleries} />
            {scene.galleries.length === 1 && (
              <GalleryViewer galleryId={scene.galleries[0].id} />
            )}
          </Tab.Pane>
        )}
        <Tab.Pane eventKey="scene-video-filter-panel">
          <SceneVideoFilterPanel scene={scene} />
        </Tab.Pane>
        <Tab.Pane className="file-info-panel" eventKey="scene-file-info-panel">
          <SceneFileInfoPanel scene={scene} />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-edit-panel" mountOnEnter>
          <SceneEditPanel
            isVisible={activeTabKey === "scene-edit-panel"}
            scene={scene}
            onSubmit={onSave}
            onDelete={() => setIsDeleteAlertOpen(true)}
            setEditMode={()=> {}}
          />
        </Tab.Pane>
        <Tab.Pane eventKey="scene-history-panel">
          <SceneHistoryPanel scene={scene} />
        </Tab.Pane>
      </Tab.Content>
    </Tab.Container>
  );

  const title = objectTitle(scene);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      {maybeRenderSceneGenerateDialog()}
      {maybeRenderDeleteDialog()}
      <div
        className={`scene-tabs order-xl-first order-last ${
          collapsed ? "collapsed" : ""
        } ${classFake}`}
      >
        <div className="d-none d-xl-block">
          {scene.studio && (
            <h1 className="mt-3 text-center">
              <Link to={`/studios/${scene.studio.id}`}>
                <img
                  src={scene.studio.image_path ?? ""}
                  alt={`${scene.studio.name} logo`}
                  className="studio-logo"
                />
              </Link>
            </h1>
          )}
          <h3 className="scene-header">{title}</h3>
        </div>
        {renderTabs()}
      </div>
      <SubmitStashBoxDraft
        type="scene"
        boxes={boxes}
        entity={scene}
        show={showDraftModal}
        onHide={() => setShowDraftModal(false)}
      />
    </>
  );
};
const UtilityBar: React.FC<UBarProps> = ({
  scene,
  setEditMode
}) => {
  const Toast = useToast();
  const intl = useIntl();
  const [updateScene] = useSceneUpdate();
  const [generateScreenshot] = useSceneGenerateScreenshot();
  const { configuration } = useContext(ConfigurationContext);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const boxes = configuration?.general?.stashBoxes ?? [];

  const [incrementO] = useSceneIncrementO(scene.id);
  const [decrementO] = useSceneDecrementO(scene.id);
  const [resetO] = useSceneResetO(scene.id);
  const downloadStream = (url: string) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const [organizedLoading, setOrganizedLoading] = useState(false);
  const [hidePlugins, setHidePlugins] = useState<boolean>(true);
  const [toolbarExpand, setToolbarExpand] = useState<boolean>(false);
  const [isGalleryOpen, setGalleryOpen] = useState<boolean>(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  async function onRescan() {
    await mutateMetadataScan({
      paths: [objectPath(scene)],
    });

    Toast.success(
      intl.formatMessage(
        { id: "toast.rescanning_entity" },
        {
          count: 1,
          singularEntity: intl
            .formatMessage({ id: "scene" })
            .toLocaleLowerCase(),
        }
      )
    );
  }
  async function onGenerateScreenshot(at?: number) {
    await generateScreenshot({
      variables: {
        id: scene.id,
        at,
      },
    });
    Toast.success(intl.formatMessage({ id: "toast.generating_screenshot" }));
  }
  function maybeRenderSceneGenerateDialog() {
    if (isGenerateDialogOpen) {
      return (
        <GenerateDialog
          selectedIds={[scene!.id]}
          onClose={() => {
            setIsGenerateDialogOpen(false);
          }}
          type="scene"
        />
      );
    }
  }
  const renderOperations = () => (
    <Dropdown className="h-fc">
      <Dropdown.Toggle
        variant="secondary"
        id="operation-menu"
        className="minimal h-fc"
        title={intl.formatMessage({ id: "operations" })}
      >
        <Icon icon={faEllipsisV} />
      </Dropdown.Toggle>
      <Dropdown.Menu className="bg-secondary text-white">
        <Dropdown.Item
          key="generate"
          className="bg-secondary text-white"
          onClick={() => setIsGenerateDialogOpen(true)}
        >
          <FormattedMessage id="actions.generate" />
          </Dropdown.Item>
          <Dropdown.Item
            key="download"
            className="bg-secondary text-white"
            onClick={() => {
              const directStream = scene.sceneStreams.find(stream => stream.label === "Direct stream");
              if (directStream) {
                downloadStream(directStream.url);
              }
            }}
          >
            <FormattedMessage
              id="actions.download"
            values={{ entityType: intl.formatMessage({ id: "scene" }) }}
          />
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
  const onIncrementClick = async () => {
    try {
      await incrementO();
    } catch (e) {
      Toast.error(e);
    }
  };

  const onDecrementClick = async () => {
    try {
      await decrementO();
    } catch (e) {
      Toast.error(e);
    }
  };
  const onOrganizedClick = async () => {
    try {
      setOrganizedLoading(true);
      await updateScene({
        variables: {
          input: {
            id: scene.id,
            organized: !scene.organized,
          },
        },
      });
    } catch (e) {
      Toast.error(e);
    } finally {
      setOrganizedLoading(false);
    }
  };

  const onResetClick = async () => {
    try {
      await resetO();
    } catch (e) {
      Toast.error(e);
    }
  };
  const scenegalleries = () => {
    const {data} = GQL.useFindGalleryQuery({
      variables: {
        id: scene.galleries[0].id
      }
    })
    const imagesrender = data?.findGallery!.files.map((img) => <img src={img.path ?? ""} />)
    return imagesrender
  }

  const galleriesimages = scene.galleries.map((gallery) => {
    var gid = "1235678789"
    if (scene.galleries[0]) {
      gid = scene.galleries[0].id
    }
    const {data} = GQL.useFindImagesQuery({
      variables: {
        filter: {
          per_page: -1,
        },
        image_filter: {
          galleries: {
            modifier: GQL.CriterionModifier.Includes,
            value: [gid]
          }
        }
      }
    })
    const images = data?.findImages.images ?? [];
    const showGalleryLightbox = useGalleryLightbox(gid);
    const renderoutput = data?.findImages.images.map((img) => (
      <a
        key={img.id}
        href={`/images/${img.id}`}
        onClick={(e) => {
          e.preventDefault(); // Prevent navigation
          showGalleryLightbox(images.indexOf(img)); // Open Lightbox at clicked image index
        }}
        style={{ backgroundImage: `url(${img.paths.thumbnail ?? ""})` }}
        className="scenegallerylink"
      />
    ));    
    return renderoutput
  })

  const maybeScanGaleries = () => {
    var gid = "1235678789"
    if (scene.galleries[0]) {
      gid = scene.galleries[0].id
    }
      const {data} = GQL.useFindImagesQuery({
        variables: {
          filter: {
            per_page: -1,
          },
          image_filter: {
            galleries: {
              modifier: GQL.CriterionModifier.Includes,
              value: [gid]
            }
          }
        }
      })
      const images = data?.findImages.images ?? [];
      const showGalleryLightbox = useGalleryLightbox(gid);
    
      return (
        <div key={gid} className="gallery">
          {images.map((img) => (
            <img
              key={img.id}
              src={img.paths.thumbnail ?? ""}
              alt={img.id}
              className="gallery-thumbnail" // Add a class for styling
              onClick={() => showGalleryLightbox(images.indexOf(img))}
            />
          ))}
        </div>
      );
  }
  const renderButtons = () => (
    <ButtonGroup className={`ml-auto ubar ${hidePlugins ? "hideplugins" : ""} ${toolbarExpand ? "toolbarexpanded" : ""}`}>
    {maybeRenderSceneGenerateDialog()}
    <Nav.Item className="ml-auto">
      <ExternalPlayerButton scene={scene} />
    </Nav.Item>
    <Nav.Item className="ml-auto">
      <OCounterButton
        value={scene.o_counter || 0}
        onIncrement={onIncrementClick}
        onDecrement={onDecrementClick}
        onReset={onResetClick}
      />
    </Nav.Item>
    <Nav.Item>
      <Button 
      className="btn-clear"
      onClick={() => setToolbarExpand(!toolbarExpand)}
      >
        <Icon icon={toolbarExpand ? faChevronLeft : faChevronRight} />
      </Button>
    </Nav.Item>
    {toolbarExpand && scene.galleries.length != 0 ? 
      <Nav.Item>
      <Button 
      className="btn-clear"
      onClick={() => setGalleryOpen(!isGalleryOpen)}
      >
        <Icon icon={faImage} />
      </Button>
      </Nav.Item> : ""
    }
    {isGalleryOpen ? <>
    <div className="scenepage-gallery">
      <Button
        className="btn-clear gclose"
        onClick={() => setGalleryOpen(false)}
        >
        <Icon icon={faX} />
      </Button>
      <div className="imgsection">
      {galleriesimages}
      </div>
      <div className="aftersgfade"></div>
    </div>
    
    </> : ""}
    <Nav.Item>
      <Button 
      className="btn-clear"
      onClick={() => setHidePlugins(!hidePlugins)}
      >
        <Icon icon={faLightbulb} />
      </Button>
    </Nav.Item>
    <Nav.Item>
      <OrganizedButton
        loading={organizedLoading}
        organized={scene.organized}
        onClick={onOrganizedClick}
      />
    </Nav.Item>
    <Nav.Item>
      <Button
      className="btn-edit"
      onClick={() => setEditMode()}
      >
        <FormattedMessage id="actions.edit"/>
      </Button>
    </Nav.Item>
    <Nav.Item>{renderOperations()}</Nav.Item>
  </ButtonGroup>
  )
  return <>{renderButtons()}</>
};
interface barProps {
  scene: GQL.SceneDataFragment
}
const NextBars: React.FC<barProps> = ({
scene,
}) => {
  const [page, setPage] = useState(1)
  const [perfPage, setPerfPage] = useState(1)
  const [rwPage, setRwPage] = useState(1)
  const [perfIndex, setPerfIndex] = useState(0)
  const [randomSeed, setRandomSeed] = useState(Math.round(Math.random()*10000000))
  function studioNext() {
    const {data, loading} = GQL.useFindScenesQuery({
      variables: {
        filter: {
          per_page: -1,
          sort: "random_" + randomSeed,

        },
        scene_filter: {
          studios: {
            modifier: GQL.CriterionModifier.Includes,
            value: [scene.studio!.id],
          }
        }
      }
    })
    const render = 
    <>
      <div className="StudioNext mb-4">
        <Button 
          disabled={page == 1 ? true : false}
          onClick={() => page != 1 ? setPage(page - 1) : ""}
          className={`ml-2 mr-2 btn-secondary`}
          >
            <Icon icon={faChevronLeft} />
          </Button>
        <div className="StudioRowNext">
          {data?.findScenes.scenes.slice((page-1)*5,(page*5)).map((sc) => <a href={`/scenes/${sc.id}`} className="NextRow d-flex flex-column">
            <ScenePreview image={sc.paths.screenshot ?? ""} video={sc.paths.preview ?? ""} isPortrait={false} soundActive={false}/>
            <span className="scTitle">{sc.title ? sc.title! : "Assign Title"}</span>
            <span className="scStudio">{sc.studio ? sc.studio!.name : "Assign Studio"}</span>
            <span className="scPerfs">{sc.performers.length != 0 ? sc.performers.map((perf) => perf.name + "  ") : ""}</span>
            <span className="scDate">{sc.date ? sc.date! : ""}</span>
          </a>)}
        </div>
        <div className="d-flex flex-column">
        <Button 
        disabled={page*5 >= data?.findScenes.count! ? true : false}
        onClick={() => page*5 < data?.findScenes.count! ? setPage(page + 1) : ""}
        className={`ml-2 mr-2 btn-secondary h-100`}
        >
          <Icon icon={faChevronRight} />
        </Button>
        <h5 className="ml-2 mr-2">{page + "/" + Math.ceil(data?.findScenes.count!/5)}</h5>
        </div>
      </div>
    </>
    return loading ? <LoadingIndicator /> : render
  }
  function perfNext(perf: any) {
    const {data, loading} = GQL.useFindScenesQuery({
      variables: {
        filter: {
          per_page: -1,
          sort: "random_" + randomSeed,

        },
        scene_filter: {
          performers: {
            modifier: GQL.CriterionModifier.Includes,
            value: [perf[perfIndex]]
          }
        }
      }
    })
    const render = 
    <>
      <div className="PerfNext mb-4">
        <Button 
          disabled={perfPage == 1 ? true : false}
          onClick={() => perfPage != 1 ? setPerfPage(perfPage - 1) : ""}
          className={`ml-2 mr-2 btn-secondary`}
          >
            <Icon icon={faChevronLeft} />
          </Button>
        <div className="PerfRowNext">
          {data?.findScenes.scenes.slice((perfPage-1)*5,(perfPage*5)).map((sc) => <a href={`/scenes/${sc.id}`} className="NextRow d-flex flex-column">
            <ScenePreview image={sc.paths.screenshot ?? ""} video={sc.paths.preview ?? ""} isPortrait={false} soundActive={false}/>
            <span className="scTitle">{sc.title ? sc.title! : "Assign Title"}</span>
            <span className="scStudio">{sc.studio ? sc.studio!.name : "Assign Studio"}</span>
            <span className="scPerfs">{sc.performers.length != 0 ? sc.performers.map((perf) => perf.name + "  ") : ""}</span>
            <span className="scDate">{sc.date ? sc.date! : ""}</span>
          </a>)}
        </div>
        <div className="d-flex flex-column">
        <Button 
        disabled={perfPage*5 >= data?.findScenes.count! ? true : false}
        onClick={() => perfPage*5 < data?.findScenes.count! ? setPerfPage(perfPage + 1) : ""}
        className={`ml-2 mr-2 btn-secondary h-100`}
        >
          <Icon icon={faChevronRight} />
        </Button>
        <h5 className="ml-2 mr-2">{perfPage + "/" + Math.ceil(data?.findScenes.count!/5)}</h5>
        </div>
      </div>
    </>
    return loading ? <LoadingIndicator /> : render
  }
  function recentlyWatched() {
    const {data, loading} = GQL.useFindScenesQuery({
      variables: {
        filter: {
          per_page: 30,
          sort: "last_played_at",
          direction: GQL.SortDirectionEnum.Desc
        }
      }
    })
    const render = 
    <>
      <div className="StudioNext mb-4">
        <Button 
          disabled={rwPage == 1 ? true : false}
          onClick={() => rwPage != 1 ? setRwPage(rwPage - 1) : ""}
          className={`ml-2 mr-2 btn-secondary`}
          >
            <Icon icon={faChevronLeft} />
          </Button>
        <div className="PerfRowNext">
          {data?.findScenes.scenes.slice((rwPage-1)*5,(rwPage*5)).map((sc) => <a href={`/scenes/${sc.id}`} className="NextRow d-flex flex-column">
            <ScenePreview image={sc.paths.screenshot ?? ""} video={sc.paths.preview ?? ""} isPortrait={false} soundActive={false}/>
            <span className="scTitle">{sc.title ? sc.title! : "Assign Title"}</span>
            <span className="scStudio">{sc.studio ? sc.studio!.name : "Assign Studio"}</span>
            <span className="scPerfs">{sc.performers.length != 0 ? sc.performers.map((perf) => perf.name + "  ") : ""}</span>
            <span className="scDate">{sc.date ? sc.date! : ""}</span>
          </a>)}
        </div>
        <div className="d-flex flex-column">
        <Button 
        disabled={rwPage*5 >= data?.findScenes.count! ? true : false}
        onClick={() => rwPage*5 < data?.findScenes.count! ? setRwPage(rwPage + 1) : ""}
        className={`ml-2 mr-2 btn-secondary h-100`}
        >
          <Icon icon={faChevronRight} />
        </Button>
        <h5 className="ml-2 mr-2">{rwPage + "/" + Math.ceil(data?.findScenes.scenes.length!/5)}</h5>
        </div>
      </div>
    </>
    return loading ? <LoadingIndicator /> : render
  }
  var lastwatchedperformersids:string[] = []
  var lastwatchedperformersnames:string[] = []
  scene.performers.map((performer) => {
    if (performer.gender === "FEMALE") lastwatchedperformersids.push(performer.id)
    if (performer.gender === "FEMALE") lastwatchedperformersnames.push(performer.name)
  })
  
  const render = 
  <>
    {scene.studio ? <div>
      <h2 className="ml-2">{scene.studio.name}</h2>
      {studioNext()}
    </div>: ""}
    {lastwatchedperformersnames.length != 0 ? <div className="">
      <div className="d-flex perfbuttons">
      <h2 className="ml-2 mr-2">{lastwatchedperformersnames[perfIndex]}</h2>
      {lastwatchedperformersnames.map((name, index) => index != perfIndex ? <Button
      className={`ml-2 btn-clear`}
      onClick={() => {
        setPerfIndex(index)
        setPerfPage(1)
      }}
      >{name}</Button> : "")}
      </div>
      {perfNext(lastwatchedperformersids)}
    </div> : ""}
    <div>
        <h2 className="ml-2">Recently Watched</h2>
        {recentlyWatched()}
    </div>
  </>
  return render
}
interface MDProps {
  scene: GQL.SceneDataFragment;
  onCancel: () => void;
}
const NewMarkerDialog: React.FC<MDProps> = ({
  scene,
  onCancel,
}) => {
  const [editingMarker, setEditingMarker] = useState<GQL.SceneMarkerDataFragment>();
  return <>
  <Modal show onHide={() => onCancel()} className="sceneMarkerDialog">
    <Modal.Header className="sceneMarkerDialogHeader">
      <span>New Marker</span>
    </Modal.Header>
    <Modal.Body>
      <SceneMarkerForm
          sceneID={scene.id}
          marker={editingMarker}
          onClose={() =>onCancel()}
        />
    </Modal.Body>
  </Modal>
  </>
};
const SceneLoader: React.FC<RouteComponentProps<ISceneParams>> = ({
  location,
  history,
  match,
}) => {
  const { id } = match.params;
  const { configuration } = useContext(ConfigurationContext);
  const { data, loading, error } = useFindScene(id);
  const [fakeAutoPlay, setFakeAutoPlay] = useState(true);
  const [scene, setScene] = useState<GQL.SceneDataFragment>();
  const file = useMemo(
    () => (scene?.files.length! > 0 ? scene?.files[0] : undefined),
    [scene]
  );
  const [editMode, setEditMode] = useState(false)
  // useLayoutEffect to update before paint
  useLayoutEffect(() => {
    // only update scene when loading is done
    if (!loading) {
      setScene(data?.findScene ?? undefined);
    }
  }, [data, loading]);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const sceneQueue = useMemo(
    () => SceneQueue.fromQueryParameters(queryParams),
    [queryParams]
  );
  const queryContinue = useMemo(() => {
    let cont = queryParams.get("continue");
    if (cont) {
      return cont === "true";
    } else {
      return !!configuration?.interface.continuePlaylistDefault;
    }
  }, [configuration?.interface.continuePlaylistDefault, queryParams]);

  const [queueScenes, setQueueScenes] = useState<QueuedScene[]>([]);
  const [updateScene] = useSceneUpdate();
  const [markerModal, setMarkerModal] = useState(false)
  const Toast = useToast();
  const intl = useIntl();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState(true);
  const [continuePlaylist, setContinuePlaylist] = useState(queryContinue);
  const [hideScrubber, setHideScrubber] = useState(
    !(configuration?.interface.showScrubber ?? true)
  );

  const _setTimestamp = useRef<(value: number) => void>();
  const initialTimestamp = useMemo(() => {
    return Number.parseInt(queryParams.get("t") ?? "0", 10);
  }, [queryParams]);
  const [cheeseKey, setKey] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueStart, setQueueStart] = useState(1);

  var autoplay = queryParams.get("autoplay") === "true";
  const [play, setPlay]= useState(false)
  const autoPlayOnSelected =
    configuration?.interface.autostartVideoOnPlaySelected ?? false;

  const currentQueueIndex = useMemo(
    () => queueScenes.findIndex((s) => s.id === id),
    [queueScenes, id]
  );

  const [isChevronDeetExpanded, setIsChevronDeetExpanded] = useState(false);
  const [isNextBarsExpanded, setIsNextBarsExpanded] = useState(true);

  function getSetTimestamp(fn: (value: number) => void) {
    _setTimestamp.current = fn;
  }

  function setTimestamp(value: number) {
    if (_setTimestamp.current) {
      _setTimestamp.current(value);
    }
  }

  // set up hotkeys
  useEffect(() => {
    Mousetrap.bind(".", () => setHideScrubber((value) => !value));

    return () => {
      Mousetrap.unbind(".");
    };
  }, []);

  async function getQueueFilterScenes(filter: ListFilterModel) {
    const query = await queryFindScenes(filter);
    const { scenes, count } = query.data.findScenes;
    setQueueScenes(scenes);
    setQueueTotal(count);
    setQueueStart((filter.currentPage - 1) * filter.itemsPerPage + 1);
  }

  async function getQueueScenes(sceneIDs: number[]) {
    const query = await queryFindScenesByID(sceneIDs);
    const { scenes, count } = query.data.findScenes;
    setQueueScenes(scenes);
    setQueueTotal(count);
    setQueueStart(1);
  }

  useEffect(() => {
    if (sceneQueue.query) {
      getQueueFilterScenes(sceneQueue.query);
    } else if (sceneQueue.sceneIDs) {
      getQueueScenes(sceneQueue.sceneIDs);
    }
  }, [sceneQueue]);

  async function onQueueLessScenes() {
    if (!sceneQueue.query || queueStart <= 1) {
      return;
    }

    const filterCopy = sceneQueue.query.clone();
    const newStart = queueStart - filterCopy.itemsPerPage;
    filterCopy.currentPage = Math.ceil(newStart / filterCopy.itemsPerPage);
    const query = await queryFindScenes(filterCopy);
    const { scenes } = query.data.findScenes;

    // prepend scenes to scene list
    const newScenes = (scenes as QueuedScene[]).concat(queueScenes);
    setQueueScenes(newScenes);
    setQueueStart(newStart);

    return scenes;
  }

  const queueHasMoreScenes = useMemo(() => {
    return queueStart + queueScenes.length - 1 < queueTotal;
  }, [queueStart, queueScenes, queueTotal]);


  async function onQueueMoreScenes() {
    if (!sceneQueue.query || !queueHasMoreScenes) {
      return;
    }

    const filterCopy = sceneQueue.query.clone();
    const newStart = queueStart + queueScenes.length;
    filterCopy.currentPage = Math.ceil(newStart / filterCopy.itemsPerPage);
    const query = await queryFindScenes(filterCopy);
    const { scenes } = query.data.findScenes;

    // append scenes to scene list
    const newScenes = queueScenes.concat(scenes);
    setQueueScenes(newScenes);
    // don't change queue start
    return scenes;
  }

  function loadScene(sceneID: string, autoPlay?: boolean, newPage?: number) {
    const sceneLink = sceneQueue.makeLink(sceneID, {
      newPage,
      autoPlay,
      continue: continuePlaylist,
    });
    history.replace(sceneLink);
  }

  async function queueNext(autoPlay: boolean) {
    if (currentQueueIndex === -1) return;

    if (currentQueueIndex < queueScenes.length - 1) {
      loadScene(queueScenes[currentQueueIndex + 1].id, autoPlay);
    } else {
      // if we're at the end of the queue, load more scenes
      if (currentQueueIndex === queueScenes.length - 1 && queueHasMoreScenes) {
        const loadedScenes = await onQueueMoreScenes();
        if (loadedScenes && loadedScenes.length > 0) {
          // set the page to the next page
          const newPage = (sceneQueue.query?.currentPage ?? 0) + 1;
          loadScene(loadedScenes[0].id, autoPlay, newPage);
        }
      }
    }
  }

  async function queuePrevious(autoPlay: boolean) {
    if (currentQueueIndex === -1) return;

    if (currentQueueIndex > 0) {
      loadScene(queueScenes[currentQueueIndex - 1].id, autoPlay);
    } else {
      // if we're at the beginning of the queue, load the previous page
      if (queueStart > 1) {
        const loadedScenes = await onQueueLessScenes();
        if (loadedScenes && loadedScenes.length > 0) {
          const newPage = (sceneQueue.query?.currentPage ?? 0) - 1;
          loadScene(
            loadedScenes[loadedScenes.length - 1].id,
            autoPlay,
            newPage
          );
        }
      }
    }
  }

  async function queueRandom(autoPlay: boolean) {
    if (sceneQueue.query) {
      const { query } = sceneQueue;
      const pages = Math.ceil(queueTotal / query.itemsPerPage);
      const page = Math.floor(Math.random() * pages) + 1;
      const index = Math.floor(
        Math.random() * Math.min(query.itemsPerPage, queueTotal)
      );
      const filterCopy = sceneQueue.query.clone();
      filterCopy.currentPage = page;
      const queryResults = await queryFindScenes(filterCopy);
      if (queryResults.data.findScenes.scenes.length > index) {
        const { id: sceneID } = queryResults.data.findScenes.scenes[index];
        // navigate to the image player page
        loadScene(sceneID, autoPlay, page);
      }
    } else if (queueTotal !== 0) {
      const index = Math.floor(Math.random() * queueTotal);
      loadScene(queueScenes[index].id, autoPlay);
    }
  }

  function onComplete() {
    // load the next scene if we're continuing
    if (continuePlaylist) {
      queueNext(true);
    }
  }

  function onDelete() {
    if (
      continuePlaylist &&
      currentQueueIndex >= 0 &&
      currentQueueIndex < queueScenes.length - 1
    ) {
      loadScene(queueScenes[currentQueueIndex + 1].id);
    } else {
      history.push("/scenes");
    }
  }

  function getScenePage(sceneID: string) {
    if (!sceneQueue.query) return;

    // find the page that the scene is on
    const index = queueScenes.findIndex((s) => s.id === sceneID);

    if (index === -1) return;

    const perPage = sceneQueue.query.itemsPerPage;
    return Math.floor((index + queueStart - 1) / perPage) + 1;
  }

  function onQueueSceneClicked(sceneID: string) {
    loadScene(sceneID, autoPlayOnSelected, getScenePage(sceneID));
  }
  

  if (!scene) {
    if (loading) return <LoadingIndicator />;
    if (error) return <ErrorMessage error={error.message} />;
    return <ErrorMessage error={`No scene found with id ${id}.`} />;
  }
  function maybeRenderPerformers() {
    return scene!.performers.length != 0 ? (
      <div className="d-flex flex-wrap justify-content-start align-content-start" style={{
      minWidth: scene!.performers.length > 1 ? "400px" : "",
      maxWidth: "400px"
      }} key={scene!.id}><PerformerButtons scene={scene!}/></div>
    ) : ("")
  }
  async function onSave(input: GQL.SceneCreateInput) {
    await updateScene({
      variables: {
        input: {
          id: scene!.id,
          ...input,
        },
      },
    });
    Toast.success(
      intl.formatMessage(
        { id: "toast.updated_entity" },
        { entity: intl.formatMessage({ id: "scene" }).toLocaleLowerCase() }
      )
    );
  }

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isVerticalVideo = scene.tags.some(tag => tag.name === "Vertical Video");

  
  const markerCar = 
  <div className="markerCar">
    {scene.scene_markers.map((marker) => (
      <div key={marker.id} className="marker-preview-container">
        <Link
          to={`/scenes/${marker.scene.id}?t=${marker.seconds}`}
          onClick={() => setPlay(!play)}
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
            alt=""
          />
          <span style={{ textAlign: "center" }}>
            {marker.title ? marker.title : marker.primary_tag.name}
          </span>
          <span style={{ textAlign: "center" }}>
            {TextUtils.secondsToTimestamp(marker.seconds)}
          </span>
        </Link>
        <button
          className="download-button"
          onClick={() => handleDownload(marker.stream)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path d="M12 16c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1s-1 .45-1 1v10c0 .55.45 1 1 1zm4.29-2.29c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L13 14.17V9c0-.55-.45-1-1-1s-1 .45-1 1v5.17l-1.88-1.88c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l3.29 3.29c.19.19.44.29.71.29s.51-.1.71-.29l3.29-3.29zM18 18H6c-.55 0-1 .45-1 1s.45 1 1 1h12c.55 0 1-.45 1-1s-.45-1-1-1z"/>
          </svg>
        </button>
      </div>
    ))}
  </div>
  const leftDeets = 
  <div className={`floatingdeets ${editMode ? 'edit-mode' : 'view-mode'}`}>
  <div className="studio-row">
    <Link to={`/studios/${scene.studio?.id}`} className="studio-row d-flex flex-row link w-fc">
      <img src={scene.studio?.image_path ?? ""} style={{height: "50px"}} className="mb-2"></img>
    </Link>
  </div>
  <div className="d-flex">
    <h1>{scene.title}</h1>
  </div>
  {file?.width && file?.height && (
    <h6>
      <FormattedMessage id="resolution" />:{" "}
      {TextUtils.resolution(file.width, file.height)}
    </h6>
  )}
  <Button
    className="btn-success mt-4"
    onClick={() => setPlay(!play)}
  >
    <Icon icon={faPlay}/> Watch
  </Button>
  <UtilityBar scene={scene} setEditMode={() => setEditMode(!editMode)}/>
  {markerCar}
</div>


  return (
    <div className="the-window">
      <div className="d-flex flex-row afterwindow">
        <ScenePage
          classFake=""
          scene={scene} 
          setTimestamp={setTimestamp}
          queueScenes={queueScenes}
          queueStart={queueStart}
          onDelete={onDelete}
          onQueueNext={() => queueNext(autoPlayOnSelected)}
          onQueuePrevious={() => queuePrevious(autoPlayOnSelected)}
          onQueueRandom={() => queueRandom(autoPlayOnSelected)}
          onQueueSceneClicked={onQueueSceneClicked}
          continuePlaylist={continuePlaylist}
          queueHasMoreScenes={queueHasMoreScenes}
          onQueueLessScenes={onQueueLessScenes}
          onQueueMoreScenes={onQueueMoreScenes}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          setContinuePlaylist={setContinuePlaylist}
          >

        </ScenePage>
        <div className={`the-vert h-fc h-100`}>
          <div className="topScene">
            {leftDeets}
            <div className="scene-player-container">
            {isVerticalVideo ? (
  <VerticalScenePlayer
    key={cheeseKey}
    scene={scene}
    play={play}
    autoplay={false}
    permitLoop={!continuePlaylist}
    initialTimestamp={initialTimestamp}
    sendSetTimestamp={getSetTimestamp}
    onComplete={onComplete}
    onNext={() => queueNext(true)}
    onPrevious={() => queuePrevious(true)}
    onBack={() => {
      if (Number.parseInt(queryParams.get("t") ?? "0", 10)) {
        history.push(`/scenes/${scene.id}/`);
      }
      autoplay = false;
      setFakeAutoPlay(false);
      setKey(cheeseKey + 1);
    }}
    onNewMarker={() => setMarkerModal(true)}
    hideScrubberOverride={hideScrubber}
  />
) : (
  <ScenePlayer
    key={cheeseKey}
    play={play}
    scene={scene}
    hideScrubberOverride={hideScrubber}
    autoplay={false}
    permitLoop={!continuePlaylist}
    initialTimestamp={initialTimestamp}
    sendSetTimestamp={getSetTimestamp}
    onComplete={onComplete}
    onNext={() => queueNext(true)}
    onPrevious={() => queuePrevious(true)}
  />
)}
            </div>
            <div className="tsfloat">
            <ScenePreview
                  image={scene.paths.screenshot ?? ""}
                  video={scene.paths.preview ?? ""}
                  isPortrait={scene.tags.some(tag => tag.name === "Vertical Video")}
                  soundActive={false}
                  />
            </div>
          </div>
          <div className="d-flex flex-row under-player">
              <div className={`barsordeets ${editMode ? "d-none" : ""}`}>
                <div className="cheeseReset" key={cheeseKey}>
                  <Button 
                  className="btn-clear"
                  onClick={() => {
                    if (Number.parseInt(queryParams.get("t") ?? "0", 10)) history.push(`/scenes/${scene.id}/`)
                    autoplay=false;
                    console.info("autoplay false")
                    setFakeAutoPlay(false);
                    setKey(cheeseKey + 1); 
                  }}
                  >
                    <Icon icon={faArrowLeft}/>
                  </Button>
                  <Button
                  className="btn-clear ssbutton"
                  onClick={() => {
                    let canvas = document.createElement('canvas');
                    let video = (document.getElementById("VideoJsPlayer_html5_api") as HTMLVideoElement);
                    canvas.width = 3840;
                    canvas.height = 2160;
                    let ctx = canvas.getContext('2d');
                    ctx!.drawImage( video, 0, 0, canvas.width, canvas.height );
                    canvas.toBlob((blob) => {window.open(URL.createObjectURL(blob!), '_blank')})
                  }}
                  >
                    <Icon icon={faCamera}/>
                  </Button>
                  <Button 
                  className="btn-clear nmbutton"
                  onClick={() => {
                    setMarkerModal(true);
                  }}
                  >
                    <Icon icon={faLocationDot}/>
                  </Button>
                  {markerModal ? <NewMarkerDialog onCancel={() => setMarkerModal(false)} scene={scene}/> : ""}
                </div>
                <div className="dadeets">
                {scene.date ? <span className="dadate mt-3">{scene.date!}</span> : ""}
                {scene.details ? <span className="dadetails mt-5">{scene.details!}</span> : ""}
                <PerformerPill performers={scene.performers}/>
                
                {(scene.tags.length != 0 || (scene.groups && scene.groups.length > 0)) && (
                  <div className="mt-5">
                    <div 
                      className="d-flex justify-content-center cursor-pointer"
                      style={{
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      onClick={() => setIsChevronDeetExpanded(!isChevronDeetExpanded)}
                    >
                      <FontAwesomeIcon 
                        icon={isChevronDeetExpanded ? faChevronUp : faChevronDown} 
                        size="lg"
                      />
                    </div>
                    
                    <div className={`mt-3 dadeetschevron-fade ${isChevronDeetExpanded ? 'show' : ''}`}>
                      {scene.tags.length != 0 && (
                        <div className="daTags">
                          {scene.tags.map((tag) => <a href={`/tags/${tag.id}`} className="daTagsTag">
                            {tag.name}
                          </a>)}
                        </div>
                      )}
                      
                      {scene.groups && scene.groups.length > 0 && (
                        <div className="mt-3">
                          <SceneGroupPanel scene={scene} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
                {/* New NextBars section with chevron */}
          <div className="mt-5">
            <div 
              className="d-flex justify-content-center cursor-pointer"
              style={{
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              onClick={() => setIsNextBarsExpanded(!isNextBarsExpanded)}
            >
              <FontAwesomeIcon 
                icon={isNextBarsExpanded ? faChevronUp : faChevronDown} 
                size="lg"
              />
            </div>
            
            <div className={`mt-3 nextbars-chevron-fade ${isNextBarsExpanded ? 'show' : ''}`}>
              <div className="dabars">
                <NextBars scene={scene}/>
              </div>
            </div>
          </div>
              </div>
            <ScenePage 
            classFake={`sp ${editMode ? "" : "d-none"}`}
            scene={scene} 
            setTimestamp={setTimestamp}
            queueScenes={queueScenes}
            queueStart={queueStart}
            onDelete={onDelete}
            onQueueNext={() => queueNext(autoPlayOnSelected)}
            onQueuePrevious={() => queuePrevious(autoPlayOnSelected)}
            onQueueRandom={() => queueRandom(autoPlayOnSelected)}
            onQueueSceneClicked={onQueueSceneClicked}
            continuePlaylist={continuePlaylist}
            queueHasMoreScenes={queueHasMoreScenes}
            onQueueLessScenes={onQueueLessScenes}
            onQueueMoreScenes={onQueueMoreScenes}
            collapsed={false}
            editFirst={true}
            setCollapsed={setCollapsed}
            setContinuePlaylist={setContinuePlaylist}
            >
  
          </ScenePage>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneLoader;