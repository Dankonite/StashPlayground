import React from "react";
import { Link } from "react-router-dom";
import * as GQL from "src/core/generated-graphql";
import { sortPerformers } from "src/core/performers";
import { PerformerCardAltHead, maybeRenderAltImageHead } from "src/components/Performers/PerformerCardAltHead"; // Ensure maybeRenderAltImageHead is exported

interface IPerformerPillProps {
  performers: GQL.PerformerDataFragment[];
  sceneDate?: string;
}

const PerformerPill: React.FC<IPerformerPillProps> = ({ performers, sceneDate }) => {
  if (performers.length === 0) return null;

  const sortedPerformers = sortPerformers(performers);

  return (
    <div className="daPerfs mt-5">
      {sortedPerformers.map((perf) => (
        <Link to={`/performers/${perf.id}`} key={perf.id} className="daPerfsCard">
          <div className="rounded-rect-container mb-2">
            <div className="circular-crop" style={{ backgroundImage: `url(${maybeRenderAltImageHead(perf.id) ?? perf.image_path ?? ""})` }} />
            <h5>{perf.name}</h5>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default PerformerPill;
