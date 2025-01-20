import React from "react";
import * as GQL from "src/core/generated-graphql";
import { IPerformerCardExtraCriteria, PerformerCardTilt } from "./PerformerCardTilt";
import { useContainerDimensions } from "../Shared/GridCard/GridCard";
import './DisplaymodeStyles.scss'

interface IPeformerCardCard {
  performers: GQL.PerformerDataFragment[];
  selectedIds: Set<string>;
  zoomIndex: number;
  onSelectChange: (id: string, selected: boolean, shiftKey: boolean) => void;
  extraCriteria?: IPerformerCardExtraCriteria;
}

export const PerformerCardCard: React.FC<IPeformerCardCard> = ({
  performers,
  selectedIds,
  onSelectChange,
  extraCriteria,
}) => {
  const [componentRef, { width }] = useContainerDimensions();
 return (
    <div className="performer card-mode" ref={componentRef}>
      <div className="row">
        {performers.map((p) => (
          <PerformerCardTilt
            key={p.id}
            containerWidth={width}
            performer={p}
            selecting={selectedIds.size > 0}
            selected={selectedIds.has(p.id)}
            onSelectedChanged={(selected: boolean, shiftKey: boolean) =>
              onSelectChange(p.id, selected, shiftKey)
            }
            extraCriteria={extraCriteria}
          />
        ))}
      </div>
    </div>
  );
};