import React from "react";
import { Link } from "react-router-dom";
import * as GQL from "src/core/generated-graphql";
import { sortPerformers } from "src/core/performers";
import { HoverPopover } from "./HoverPopover";
import { PopoverContent } from "react-bootstrap";

interface IProps {
  performers: Partial<GQL.PerformerDataFragment>[];
}

export const PerformerNameButton: React.FC<IProps> = ({ performers }) => {
  const sorted = sortPerformers(performers);
  var l = 0
  const popoverContent = sorted.map((performer, index) => (
        <div className="d-inline-block comma-list overflowable" key={performer.id}>
        <Link
          to={`/performers/${performer.id}`}
          className="performer-name col p-0"
        >
        <span>{performer.name}</span>
        </Link>
        {index == performers.length - 1 ? "" : <div className="d-inline-block mr-2">,</div>}
        </div>
        
  )
  );
  const ulstyle = {
    listStyle: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    padding: "0",
    maxHeight: "1lh",
    margin: "0",
    
  }
  const listyle = {
    display: "inline"
  }
  const perfFavorite = {
    color: "#FFCE45",
    display: "inline"
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
  <div className="perfname-list" style={{transition: "max-height 0s"}}>
        {/* {popoverContent} */}
        {popoverTest}
  </div>
  );
};
