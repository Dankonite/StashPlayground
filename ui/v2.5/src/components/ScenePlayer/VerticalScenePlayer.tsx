import React, {
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import videojs, { VideoJsPlayer, VideoJsPlayerOptions } from "video.js";
import useScript from "src/hooks/useScript";
import "videojs-contrib-dash";
import "videojs-mobile-ui";
import "videojs-seek-buttons";
import { UAParser } from "ua-parser-js";
import "./live";
import "./PlaylistButtons";
import "./source-selector";
import "./persist-volume";
import "./markers";
import "./vtt-thumbnails";
import "./big-buttons";
import "./track-activity";
import "./vrmode";
import "./VerticalScenePlayer.css";
import cx from "classnames";
import {
  useSceneSaveActivity,
  useSceneIncrementPlayCount,
} from "src/core/StashService";
import * as GQL from "src/core/generated-graphql";
import { ConfigurationContext } from "src/hooks/Config";
import {
  ConnectionState,
  InteractiveContext,
} from "src/hooks/Interactive/context";
import { SceneInteractiveStatus } from "src/hooks/Interactive/status";
import { languageMap } from "src/utils/caption";
import { VIDEO_PLAYER_ID } from "./util";
import { Button } from "react-bootstrap";
import { Icon } from "src/components/Shared/Icon";
import { faArrowLeft, faCamera, faLocationDot } from "@fortawesome/free-solid-svg-icons";
import PerformerInfoPanel from "./PerformerInfoPanel";
// @ts-ignore
import abLoopPlugin from "videojs-abloop";

// Register videojs plugins
// At the top of VerticalScenePlayer.tsx

let pluginsRegistered = false;

const registerPlugins = () => {
  if (pluginsRegistered) return;
  
  try {
    // Removed airplay and chromecast
    abLoopPlugin(window, videojs);
    pluginsRegistered = true;
  } catch (error) {
    console.warn('Plugin registration error:', error);
  }
};

// Progress bar component
const ProgressBar: React.FC<{
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}> = ({ currentTime, duration, onSeek }) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [previewTime, setPreviewTime] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percentage = 1 - ((e.clientY - rect.top) / rect.height);
    const newTime = Math.max(0, Math.min(percentage * duration, duration));
    setPreviewTime(newTime);
    setShowPreview(true);
  };

  const handleMouseLeave = () => {
    setShowPreview(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percentage = 1 - ((e.clientY - rect.top) / rect.height);
    const newTime = Math.max(0, Math.min(percentage * duration, duration));
    onSeek(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const previewPosition = previewTime / duration * 100;

  return (
    <div 
      className="shorts-progress-container" 
      ref={progressRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="shorts-progress-bar"
        style={{ height: `${progress}%` }}
      />
      {showPreview && (
        <div 
          className="shorts-time-preview"
          style={{ top: `${100 - previewPosition}%` }}
        >
          {formatTime(previewTime)}
        </div>
      )}
    </div>
  );
};

interface IControlButtonsProps {
  // Instead of creating new handlers, we'll reference the existing buttons
  backButton?: HTMLButtonElement | null;
  markerButton?: HTMLButtonElement | null;
}

// Control buttons component
const ControlButtons: React.FC<IControlButtonsProps> = ({
  backButton,
  markerButton
}) => {
  const triggerClick = (element: HTMLButtonElement | null | undefined) => {
    element?.click();
  };

  return (
    <div className="vertical-control-buttons">
      <Button 
        className="btn-clear" 
        onClick={() => triggerClick(backButton)}
      >
        <Icon icon={faArrowLeft}/>
      </Button>
      <Button 
        className="btn-clear" 
        onClick={() => triggerClick(markerButton)}
      >
        <Icon icon={faLocationDot}/>
      </Button>
    </div>
  );
};
// Handle hotkeys function
function handleHotkeys(player: VideoJsPlayer, event: videojs.KeyboardEvent) {
  function seekStep(step: number) {
    const time = player.currentTime() + step;
    const duration = player.duration();
    if (time < 0) {
      player.currentTime(0);
    } else if (time < duration) {
      player.currentTime(time);
    } else {
      player.currentTime(duration);
    }
  }

  function seekPercent(percent: number) {
    const duration = player.duration();
    const time = duration * percent;
    player.currentTime(time);
  }

  let seekFactor = 10;
  if (event.shiftKey) {
    seekFactor = 5;
  } else if (event.ctrlKey || event.altKey) {
    seekFactor = 60;
  }

  switch (event.which) {
    case 39: // right arrow
      seekStep(seekFactor);
      break;
    case 37: // left arrow
      seekStep(-seekFactor);
      break;
    case 32: // space
    case 13: // enter
      if (player.paused()) player.play();
      else player.pause();
      break;
    case 77: // m
      player.muted(!player.muted());
      break;
    case 70: // f
      if (player.isFullscreen()) player.exitFullscreen();
      else player.requestFullscreen();
      break;
  }
}

interface IVerticalScenePlayerProps {
  scene: GQL.SceneDataFragment;
  play: boolean;
  hideScrubberOverride: boolean;
  autoplay?: boolean;
  permitLoop?: boolean;
  initialTimestamp: number;
  sendSetTimestamp: (setTimestamp: (value: number) => void) => void;
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
  maxWidth?: number;
  maxHeight?: number;
  backButton?: HTMLButtonElement | null;
  markerButton?: HTMLButtonElement | null;
}

export const VerticalScenePlayer: React.FC<IVerticalScenePlayerProps> = ({
  scene,
  play,
  autoplay,
  permitLoop = true,
  initialTimestamp: _initialTimestamp,
  sendSetTimestamp,
  onComplete,
  onNext,
  onPrevious,
  maxWidth = 400,
  maxHeight = 712,
  backButton,
  markerButton
}) => {
  const [showPerformerInfo, setShowPerformerInfo] = useState(false);
  const { configuration } = useContext(ConfigurationContext);
  const { interactive: interactiveClient } = useContext(InteractiveContext);
  const uiConfig = configuration?.ui;
  const interfaceConfig = configuration?.interface;
  const [sceneSaveActivity] = useSceneSaveActivity();
  const [sceneIncrementPlayCount] = useSceneIncrementPlayCount();
  const minimumPlayPercent = uiConfig?.minimumPlayPercent ?? 0;
  const trackActivity = uiConfig?.trackActivity ?? true;
  const videoRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<VideoJsPlayer>();
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const started = useRef(false);
  const auto = useRef(false);
  const sceneId = useRef<string>();



  useEffect(() => {
    registerPlugins();
  }, []);

  useScript(
    "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1",
    uiConfig?.enableChromecast
  );

  const getPlayer = useCallback(() => {
    if (!player || player.isDisposed()) return null;
    return player;
  }, [player]);

    // Add cleanup effect
    useEffect(() => {
      return () => {
        // Cleanup when component unmounts
        const player = getPlayer();
        if (player) {
          player.dispose();
        }
        started.current = false;
        auto.current = false;
        sceneId.current = undefined;
      };
    }, [getPlayer]);

  // Initialize VideoJS player
  useEffect(() => {
    const options: VideoJsPlayerOptions = {
      id: VIDEO_PLAYER_ID,
      controls: true,
      controlBar: {
        pictureInPictureToggle: false,
        volumePanel: {
          inline: false,
        },
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'fullscreenToggle'
        ]
      },
      html5: {
        dash: {
          updateSettings: [
            {
              streaming: {
                buffer: {
                  bufferTimeAtTopQuality: 30,
                  bufferTimeAtTopQualityLongForm: 30,
                },
                gaps: {
                  jumpGaps: false,
                  jumpLargeGaps: false,
                },
              },
            },
          ],
        },
      },
      nativeControlsForTouch: false,
      playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      preload: "auto",
      playsinline: true,
      techOrder: ["chromecast", "html5"],
      plugins: {
        vttThumbnails: {
          showTimestamp: true,
        },
        markers: {},
        sourceSelector: {},
        persistVolume: {},
        bigButtons: {},
        seekButtons: {
          forward: 10,
          back: 10,
        },
        skipButtons: {},
        trackActivity: {},
        vrMenu: {},
        abLoopPlugin: {
          start: 0,
          end: false,
          enabled: false,
          loopIfBeforeStart: true,
          loopIfAfterEnd: true,
          pauseAfterLooping: false,
          pauseBeforeLooping: false,
          createButtons: uiConfig?.showAbLoopControls ?? false,
        },
      },
      userActions: {
        hotkeys: function(this: VideoJsPlayer, event) {
          handleHotkeys(this, event);
        },
      },
      fluid: false,
    };

    const videoEl = document.createElement("video-js");
    videoEl.setAttribute("data-vjs-player", "true");
    videoEl.classList.add("vjs-big-play-centered", "vjs-short-form");
    videoRef.current?.appendChild(videoEl);

    const vjs = videojs(videoEl, options);
    vjs.focus();
    setPlayer(vjs);

    return () => {
      vjs.dispose();
      videoEl.remove();
      setPlayer(undefined);
      sceneId.current = undefined;
    };
  }, []);

  // Handle screenshot functionality
  const handleScreenshot = () => {
    const video = document.getElementById("VideoJsPlayer_html5_api") as HTMLVideoElement;
    if (!video) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${Math.floor(Date.now() / 1000)}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', 0.95);
  };

  // Handle time updates
  useEffect(() => {
    const player = getPlayer();
    if (!player) return;

    const handleTimeUpdate = () => {
      setCurrentTime(player.currentTime());
    };

    const handleDurationChange = () => {
      setDuration(player.duration());
    };

    player.on("timeupdate", handleTimeUpdate);
    player.on("durationchange", handleDurationChange);

    return () => {
      player.off("timeupdate", handleTimeUpdate);
      player.off("durationchange", handleDurationChange);
    };
  }, [getPlayer]);

  // Handle scene/source changes
  useEffect(() => {
    const player = getPlayer();
    if (!player) return;

    // don't re-initialise the player unless the scene has changed
    if (!scene.files[0] || scene.id === sceneId.current) return;

    sceneId.current = scene.id;

    // reset on new scene
    player.trackActivity().reset();

    const isSafari = UAParser().browser.name?.includes("Safari");
    const file = scene.files[0];
    const isPortrait = file.height && file.width && file.height > file.width;

    const mobileUiOptions = {
      fullscreen: {
        enterOnRotate: true,
        exitOnRotate: true,
        lockOnRotate: true,
        lockToLandscapeOnEnter: false,
      },
      touchControls: {
        disabled: true,
      },
    };

    if (!isSafari) {
      player.mobileUi(mobileUiOptions);
    }

    const sourceSelector = player.sourceSelector();
    sourceSelector.setSources(
      scene.sceneStreams.map((stream) => ({
        src: stream.url,
        type: stream.mime_type ?? undefined,
        label: stream.label ?? undefined,
      }))
    );

    auto.current = autoplay || _initialTimestamp > 0;

    const alwaysStartFromBeginning = uiConfig?.alwaysStartFromBeginning ?? false;
    const resumeTime = scene.resume_time ?? 0;

    let startPosition = _initialTimestamp;
    if (!startPosition && !alwaysStartFromBeginning && file.duration > resumeTime) {
      startPosition = resumeTime;
    }

    if (scene.paths.screenshot) {
      player.poster(scene.paths.screenshot);
    }

    player.load();
    
    if (startPosition) {
      player.currentTime(startPosition);
    }

    started.current = false;
  }, [getPlayer, scene, autoplay, _initialTimestamp]);

  // Handle activity tracking
  useEffect(() => {
    const player = getPlayer();
    if (!player) return;

    async function saveActivity(resumeTime: number, playDuration: number) {
      if (!scene.id) return;

      await sceneSaveActivity({
        variables:
        {
          id: scene.id,
          playDuration,
          resume_time: resumeTime,
        },
      });
  }

  async function incrementPlayCount() {
    if (!scene.id) return;

    await sceneIncrementPlayCount({
      variables: {
        id: scene.id,
      },
    });
  }

  const activity = player.trackActivity();
  activity.saveActivity = saveActivity;
  activity.incrementPlayCount = incrementPlayCount;
  activity.minimumPlayPercent = minimumPlayPercent;
  activity.setEnabled(trackActivity);
}, [getPlayer, scene, trackActivity, minimumPlayPercent, sceneIncrementPlayCount, sceneSaveActivity]);

// Handle fullscreen changes
useEffect(() => {
  const player = getPlayer();
  if (!player) return;

  const handleFullscreenChange = () => {
    setFullscreen(player.isFullscreen());
    const wrapper = videoRef.current;
    if (wrapper) {
      wrapper.classList.toggle('is-fullscreen', player.isFullscreen());
    }
  };

  player.on("fullscreenchange", handleFullscreenChange);
  return () => player.off("fullscreenchange", handleFullscreenChange);
}, [getPlayer]);

// Handle play/pause toggle
useEffect(() => {
  const player = getPlayer();
  if (!player) return;
  
  if (play && player.paused()) {
    player.play();
  } else if (!play && !player.paused()) {
    player.pause();
  }
}, [play, getPlayer]);

// Handle completion
useEffect(() => {
  const player = getPlayer();
  if (!player) return;

  player.on("ended", onComplete);
  return () => player.off("ended");
}, [getPlayer, onComplete]);

// Handle interactive features
useEffect(() => {
  const player = getPlayer();
  if (!player) return;

  function onplay(this: VideoJsPlayer) {
    if (scene.interactive) {
      interactiveClient.play(this.currentTime());
    }
  }

  function pause() {
    interactiveClient.pause();
  }

  function seeking(this: VideoJsPlayer) {
    if (this.paused()) return;
    if (scene.interactive) {
      interactiveClient.play(this.currentTime());
    }
  }

  function timeupdate(this: VideoJsPlayer) {
    if (this.paused()) return;
    if (scene.interactive) {
      interactiveClient.ensurePlaying(this.currentTime());
    }
    setCurrentTime(this.currentTime());
  }

  player.on("play", onplay);
  player.on("pause", pause);
  player.on("seeking", seeking);
  player.on("timeupdate", timeupdate);

  return () => {
    player.off("play", onplay);
    player.off("pause", pause);
    player.off("seeking", seeking);
    player.off("timeupdate", timeupdate);
  };
}, [getPlayer, interactiveClient, scene]);

const handleSeek = useCallback((time: number) => {
  const player = getPlayer();
  if (player) {
    player.currentTime(time);
  }
}, [getPlayer]);

// Handle markers
useEffect(() => {
  const player = getPlayer();
  if (!player) return;

  const markers = player.markers();
  markers.clearMarkers();
  for (const marker of scene.scene_markers) {
    markers.addMarker({
      time: marker.seconds,
      title: marker.title || `${marker.primary_tag.name}`,
    });
  }
}, [getPlayer, scene]);

const file = scene.files[0];
const isPortrait = file?.height && file?.width && file.height > file.width;

return (
  <div 
    className={cx("VideoPlayer-container", { portrait: isPortrait })}
    style={{
      maxWidth: `${maxWidth}px`,
      maxHeight: `${maxHeight}px`,
    }}
  >
    <div className={cx("VideoPlayer-card", { "is-fullscreen": fullscreen })}>
      <div className="video-wrapper" ref={videoRef} />
      <PerformerInfoPanel 
      show={showPerformerInfo}
      performers={scene.performers}
      sceneId={scene.id} // Make sure this is being passed
      onToggle={() => setShowPerformerInfo(!showPerformerInfo)}
      onClickMarker={(marker) => {
        // Handle marker click - usually sets the video time
        if (getPlayer()) {
          getPlayer()?.currentTime(marker.seconds);
        }
      }}
    />
      {!fullscreen && (
        <>
          <ControlButtons
            backButton={backButton}
            markerButton={markerButton}
          />
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />
        </>
      )}
    </div>
  </div>
);
};

export default VerticalScenePlayer;