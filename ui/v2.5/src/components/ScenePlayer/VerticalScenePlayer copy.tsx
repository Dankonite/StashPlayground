import React, {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import videojs, { VideoJsPlayer, VideoJsPlayerOptions } from "video.js";
import * as GQL from "src/core/generated-graphql";
import { VIDEO_PLAYER_ID } from "./util";
import cx from "classnames";
import "./VerticalScenePlayer.css";

// Utility function for taking screenshots
function captureVideoFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.95);
}

function downloadScreenshot(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Basic hotkey handler for essential controls
function handleHotkeys(player: VideoJsPlayer, event: videojs.KeyboardEvent) {
  const seekStep = (step: number) => {
    const time = player.currentTime() + step;
    const duration = player.duration();
    if (time < 0) {
      player.currentTime(0);
    } else if (time < duration) {
      player.currentTime(time);
    } else {
      player.currentTime(duration);
    }
  };

  let seekAmount = 10;
  if (event.shiftKey) {
    seekAmount = 5;
  }

  switch (event.which) {
    case 39: // right arrow
      seekStep(seekAmount);
      break;
    case 37: // left arrow
      seekStep(-seekAmount);
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

// Progress bar component
const ProgressBar: React.FC<{
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}> = ({ currentTime, duration, onSeek }) => {
  const progressRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percentage = 1 - ((e.clientY - rect.top) / rect.height);
    onSeek(percentage * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="shorts-progress-container" 
      ref={progressRef}
      onClick={handleClick}
    >
      <div 
        className="shorts-progress-bar"
        style={{ height: `${progress}%` }}
      />
    </div>
  );
};

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
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<VideoJsPlayer>();
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const getPlayer = useCallback(() => {
    if (!player || player.isDisposed()) return null;
    return player;
  }, [player]);

  // Handle screenshot functionality
  const handleScreenshot = useCallback(() => {
    const player = getPlayer();
    if (!player) return;

    const video = player.el().querySelector('video');
    if (!video) return;

    const screenshot = captureVideoFrame(video);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.jpg`;
    downloadScreenshot(screenshot, filename);
  }, [getPlayer]);

  // Screenshot button component
  const ScreenshotButton: React.FC = () => (
    <div 
      className="screenshot-button"
      onClick={handleScreenshot}
      title="Take Screenshot"
    >
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </div>
  );

  // Initialize VideoJS player
  useEffect(() => {
    const options: VideoJsPlayerOptions = {
      id: VIDEO_PLAYER_ID,
      controls: true,
      controlBar: {
        progressControl: false,
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
      playbackRates: [0.5, 1, 1.5, 2],
      preload: "auto",
      playsinline: true,
      userActions: {
        hotkeys: function(this: VideoJsPlayer, event) {
          handleHotkeys(this, event);
        },
      },
      fluid: true,
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
    };
  }, []);

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

    const file = scene.files[0];
    if (!file) return;

    player.src({
      src: scene.sceneStreams[0]?.url,
      type: scene.sceneStreams[0]?.mime_type ?? undefined,
    });

    if (scene.paths.screenshot) {
      player.poster(scene.paths.screenshot);
    }

    player.load();
    
    if (autoplay) {
      player.play();
    }
  }, [getPlayer, scene, autoplay]);

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
    if (!player || !onComplete) return;

    player.on("ended", onComplete);
    return () => player.off("ended", onComplete);
  }, [getPlayer, onComplete]);

  const handleSeek = useCallback((time: number) => {
    const player = getPlayer();
    if (player) {
      player.currentTime(time);
    }
  }, [getPlayer]);

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
      <div 
        className={cx("VideoPlayer-card", { "is-fullscreen": fullscreen })}
      >
        <div className="video-wrapper" ref={videoRef} />
        {!fullscreen && (
          <>
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />
            <ScreenshotButton />
          </>
        )}
      </div>
    </div>
  );
};

export default VerticalScenePlayer;