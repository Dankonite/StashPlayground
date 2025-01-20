import React from 'react';
import * as GQL from "src/core/generated-graphql";
import cx from "classnames";
import './PerformerInfoPanel.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface IPerformerInfoPanelProps {
  show: boolean;
  performers: Array<Pick<GQL.Performer, "id" | "name" | "gender" | "measurements" | "image_path">>;
  className?: string;
  onToggle: () => void;
}

const PerformerInfoPanel: React.FC<IPerformerInfoPanelProps> = ({ 
  show, 
  performers,
  className,
  onToggle 
}) => {
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
        <div className="performer-info-vertical-content">
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
      </div>
    </div>
  );
};

export default PerformerInfoPanel;