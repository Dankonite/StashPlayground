import React, { useState, useEffect } from 'react';
import * as GQL from "src/core/generated-graphql";
import cx from "classnames";
import './PerformerInfoPanel.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronLeft, 
  faChevronRight, 
  faUser, 
  faLocationDot,
  faFilm,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { Button } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { MarkerWallPanel } from "src/components/Wall/WallPanel";
import { PrimaryTags } from '../Scenes/SceneDetails/PrimaryTags';
import { SceneMarkerForm } from '../Scenes/SceneDetails/SceneMarkerForm';
import TextUtils from 'src/utils/text';
import { Link } from 'react-router-dom';
import { maybeRenderAltImageHead } from "src/components/Performers/PerformerCardAltHead";
import { SceneCard } from '../Scenes/SceneCard';
import { useHistory } from 'react-router-dom';

interface IPerformerInfoPanelProps {
  show: boolean;
  performers: Array<Pick<GQL.Performer, "id" | "name" | "gender" | "measurements" | "image_path">>;
  sceneId: string;
  className?: string;
  onToggle: () => void;
  onClickMarker: (marker: GQL.SceneMarkerDataFragment) => void;
}

type TabType = 'performers' | 'markers' | 'scenes';

const PerformerInfoPanel: React.FC<IPerformerInfoPanelProps> = ({ 
  show, 
  performers,
  sceneId,
  className,
  onToggle,
  onClickMarker
}) => {
  // Keep ALL hooks at the top level
  const [activeTab, setActiveTab] = useState<TabType>('performers');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingMarker, setEditingMarker] = useState<GQL.SceneMarkerDataFragment>();
  const [play, setPlay] = useState(false);
  const [perfPage, setPerfPage] = useState(1);
  const [randomSeed] = useState(Math.round(Math.random()*10000000));

  // GraphQL query hook
  const { data, loading } = GQL.useFindSceneMarkerTagsQuery({
    variables: { id: sceneId },
    skip: activeTab !== 'markers' // Only fetch when markers tab is active
  });

  // Process markers data
  const sceneMarkers = data?.sceneMarkerTags?.map((tag) => tag.scene_markers) ?? [];
  const flattenedMarkers = sceneMarkers.reduce((prev, current) => [...prev, ...current], []);

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function onOpenEditor(marker?: GQL.SceneMarkerDataFragment) {
    setIsEditorOpen(true);
    setEditingMarker(marker ?? undefined);
  }

  const closeEditor = () => {
    setEditingMarker(undefined);
    setIsEditorOpen(false);
  };

  const renderPerformers = () => (
    <div className="tab-content">
      {performers.map((performer) => (
        <Link key={performer.id} to={`/performers/${performer.id}`}>
          <div className="performer-info-vertical-item">
            {performer.image_path && (
              <img
                src={maybeRenderAltImageHead(performer.id) ?? performer.image_path ?? ""}
                alt={performer.name}
                className="performer-vertical-image"
              />
            )}
            <div className="performer-vertical-details">
              <h3>{performer.name}</h3>
              {performer.gender && <p className="performer-detail">Gender: {performer.gender}</p>}
              {performer.measurements && <p className="performer-detail">{performer.measurements}</p>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );

  const renderMarkers = () => (
    <div className="tab-content">
      {loading ? (
        <div>Loading markers...</div>
      ) : isEditorOpen ? (
        <SceneMarkerForm
          sceneID={sceneId}
          marker={editingMarker}
          onClose={closeEditor}
        />
      ) : (
        <div className="markers-content">
          <Button className="create-marker-btn" onClick={() => onOpenEditor()}>
            <FontAwesomeIcon icon={faPlus} />
            <FormattedMessage id="actions.create_marker" />
          </Button>
          <div className="markers-container">
            {flattenedMarkers.map((marker) => (
              <div key={marker.id} className="marker-preview-container">
                <Link
                  to={`/scenes/${marker.scene.id}?t=${marker.seconds}&autoplay=true`}
                  onClick={() => onClickMarker(marker)}
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
        </div>
      )}
    </div>
  );
  const renderScenes = () => {
    const { data, loading } = GQL.useFindScenesQuery({
      variables: {
        filter: {
          per_page: -1,
          sort: "random_" + randomSeed,
        },
        scene_filter: {
          performers: {
            modifier: GQL.CriterionModifier.Includes,
            value: performers.map(p => p.id)
          },
        }
      }
    });  
    // If loading, return loading state
    if (loading) return <div>Loading scenes...</div>;
  
    // If no scenes, return appropriate message
    if (!data?.findScenes.scenes || data.findScenes.scenes.length === 0) {
      return <div>No other scenes found for these performers</div>;
    }
  
    const scenesToRender = data.findScenes.scenes.slice((perfPage - 1) * 10, (perfPage * 10));
  
    return (
      <div className="tab-content">
        <div className="markers-content">
          <div className="scenes-container">
            {scenesToRender.map((sc) => (
              <div 
                key={sc.id} 
                className="scene-container"
                onClick={() => window.location.href = `/scenes/${sc.id}?autoplay=true`}
              >
                <SceneCard scene={sc} compact={true} />
              </div>
            ))}
          </div>
          
          <div className="d-flex justify-content-center mt-3">
            <Button 
              disabled={perfPage === 1}
              onClick={() => perfPage !== 1 ? setPerfPage(perfPage - 1) : undefined}
              className="mx-2 btn-secondary"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </Button>
            
            <span className="mx-3 d-flex align-items-center">
              {perfPage}/{Math.ceil((data.findScenes.count ?? 0)/10)}
            </span>
            
            <Button 
              disabled={perfPage * 10 >= data.findScenes.count}
              onClick={() => data && perfPage * 10 < data.findScenes.count 
                ? setPerfPage(perfPage + 1) 
                : undefined}
              className="mx-2 btn-secondary"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // Create a wrapper component to handle navigation
  const SceneCardWrapper: React.FC<{ scene: GQL.SlimSceneDataFragment }> = ({ scene }) => {
    const history = useHistory();
  
    const handleSceneClick = () => {
      history.push(`/scenes/${scene.id}`);
    };
  
    return (
      <div onClick={handleSceneClick} style={{ cursor: 'pointer' }}>
        <SceneCard scene={scene} compact={true} />
      </div>
    );
  };

  // Instead of switching, render all tabs and control visibility with CSS
  const renderTabs = () => {
    return (
      <div className="info-panel-content">
        {/* Always render all tabs, but only show the active one */}
        <div style={{ display: activeTab === 'performers' ? 'block' : 'none' }}>
          {renderPerformers()}
        </div>
        <div style={{ display: activeTab === 'markers' ? 'block' : 'none' }}>
          {renderMarkers()}
        </div>
        <div style={{ display: activeTab === 'scenes' ? 'block' : 'none' }}>
          {renderScenes()}
        </div>
      </div>
    );
  };

  return (
    <div className={cx("performer-info-container", { show }, className)}>
      <div 
        className="performer-info-trigger"
        onClick={onToggle}
        role="button"
        tabIndex={0}
      >
        <FontAwesomeIcon 
          icon={show ? faChevronRight : faChevronLeft} 
          className="trigger-icon"
        />
      </div>

      <div className="performer-info-panel">
        <div className="info-panel-tabs">
          <button 
            className={cx("tab-button", { active: activeTab === 'performers' })}
            onClick={() => setActiveTab('performers')}
          >
            <FontAwesomeIcon icon={faUser} />
            <span>Performers</span>
          </button>
          <button 
            className={cx("tab-button", { active: activeTab === 'markers' })}
            onClick={() => setActiveTab('markers')}
          >
            <FontAwesomeIcon icon={faLocationDot} />
            <span>Markers</span>
          </button>
          <button 
            className={cx("tab-button", { active: activeTab === 'scenes' })}
            onClick={() => setActiveTab('scenes')}
          >
            <FontAwesomeIcon icon={faFilm} />
            <span>Scenes</span>
          </button>
        </div>

        {renderTabs()}
      </div>
    </div>
  );
};

export default PerformerInfoPanel;