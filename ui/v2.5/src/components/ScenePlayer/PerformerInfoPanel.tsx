import React, { useState } from 'react';
import * as GQL from "src/core/generated-graphql";
import cx from "classnames";
import './PerformerInfoPanel.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronLeft, 
  faChevronRight, 
  faUser, 
  faLocationDot,
  faFilm
} from '@fortawesome/free-solid-svg-icons';

interface IPerformerInfoPanelProps {
  show: boolean;
  performers: Array<Pick<GQL.Performer, "id" | "name" | "gender" | "measurements" | "image_path">>;
  markers?: Array<any>; // Add proper type
  scenes?: Array<any>; // Add proper type
  className?: string;
  onToggle: () => void;
}

type TabType = 'performers' | 'markers' | 'scenes';

const PerformerInfoPanel: React.FC<IPerformerInfoPanelProps> = ({ 
  show, 
  performers,
  markers = [],
  scenes = [],
  className,
  onToggle 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('performers');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'performers':
        return (
          <div className="tab-content">
            {performers.map((performer) => (
              <div key={performer.id} className="performer-info-vertical-item">
                {performer.image_path && (
                  <img 
                    src={performer.image_path} 
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
            ))}
          </div>
        );
      case 'markers':
        return (
          <div className="tab-content">
            <div className="info-placeholder">Markers section coming soon</div>
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