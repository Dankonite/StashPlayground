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
import Mousetrap from "mousetrap";
import { MarkerWallPanel } from "src/components/Wall/WallPanel";
import { PrimaryTags } from '../Scenes/SceneDetails/PrimaryTags';
import { SceneMarkerForm } from '../Scenes/SceneDetails/SceneMarkerForm';
import TextUtils from 'src/utils/text';
import { Link} from 'react-router-dom';
import { maybeRenderAltImageHead } from "src/components/Performers/PerformerCardAltHead";


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
  const [activeTab, setActiveTab] = useState<TabType>('performers');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingMarker, setEditingMarker] = useState<GQL.SceneMarkerDataFragment>();
  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data, loading } = GQL.useFindSceneMarkerTagsQuery({
    variables: { id: sceneId },
  });

  // Set up hotkeys for markers
  useEffect(() => {
    if (!show || activeTab !== 'markers') return;
    Mousetrap.bind("n", () => onOpenEditor());
    return () => {
      Mousetrap.unbind("n");
    };
  }, [show, activeTab]);

  function onOpenEditor(marker?: GQL.SceneMarkerDataFragment) {
    setIsEditorOpen(true);
    setEditingMarker(marker ?? undefined);
  }

  const closeEditor = () => {
    setEditingMarker(undefined);
    setIsEditorOpen(false);
  };
   const [play, setPlay]= useState(false)

  const sceneMarkers = data?.sceneMarkerTags.map((tag) => tag.scene_markers) ?? [];
  const flattenedMarkers = sceneMarkers.reduce((prev, current) => [...prev, ...current], []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'performers':
  return (
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
      case 'markers':
  if (loading) return <div className="tab-content">Loading markers...</div>;
  if (isEditorOpen) {
    return (
      <div className="tab-content">
        <SceneMarkerForm
          sceneID={sceneId}
          marker={editingMarker}
          onClose={closeEditor}
        />
      </div>
    );
  }
      return (
        <div className="tab-content markers-content">
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
          );
      case 'scenes':
        return (
          <div className="tab-content">
            <div className="info-placeholder">Scenes section coming soon</div>
          </div>
        );
    }
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

        <div className="info-panel-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default PerformerInfoPanel;