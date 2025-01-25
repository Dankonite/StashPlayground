import videojs, { VideoJsPlayer } from "video.js";

interface IMarker {
  title: string;
  seconds: number;
  end_seconds?: number | null;
}

interface IMarkersOptions {
  markers?: IMarker[];
}

class MarkersPlugin extends videojs.getPlugin("plugin") {
  private markers: IMarker[] = [];
  private markerDivs: HTMLDivElement[] = [];
  private markerTooltip: HTMLElement | null = null;
  private defaultTooltip: HTMLElement | null = null;

  constructor(player: VideoJsPlayer, options?: IMarkersOptions) {
    super(player);

    player.ready(() => {
      const tooltip = videojs.dom.createEl("div") as HTMLElement;
      tooltip.className = "vjs-marker-tooltip";
      tooltip.style.visibility = "hidden";

      const parent = player.el().querySelector(".vjs-progress-holder .vjs-mouse-display");
      if (parent) parent.appendChild(tooltip);
      this.markerTooltip = tooltip;

      this.defaultTooltip = player.el().querySelector<HTMLElement>(
        ".vjs-progress-holder .vjs-mouse-display .vjs-time-tooltip"
      );

      options?.markers?.forEach(this.addMarker, this);
    });
  }

  private showMarkerTooltip(title: string) {
    if (!this.markerTooltip) return;
    this.markerTooltip.innerText = title;
    this.markerTooltip.style.right = `${-this.markerTooltip.clientWidth / 2}px`;
    this.markerTooltip.style.visibility = "visible";
    if (this.defaultTooltip) this.defaultTooltip.style.visibility = "hidden";
  }

  private hideMarkerTooltip() {
    if (this.markerTooltip) this.markerTooltip.style.visibility = "hidden";
    if (this.defaultTooltip) this.defaultTooltip.style.visibility = "visible";
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  addMarker(marker: IMarker) {
    const markerDiv = videojs.dom.createEl("div") as HTMLDivElement;
    const duration = this.player.duration();

    if (marker.end_seconds) {
      // Range marker
      markerDiv.className = "vjs-marker-range";
      if (duration) {
        const startPercent = (marker.seconds / duration) * 100;
        const endPercent = (marker.end_seconds / duration) * 100;
        const width = endPercent - startPercent;
        
        markerDiv.style.left = `${startPercent}%`;
        markerDiv.style.width = `${width}%`;
        
        const startLabel = videojs.dom.createEl("span") as HTMLSpanElement;
        startLabel.className = "marker-time-label start";
        startLabel.textContent = this.formatTime(marker.seconds);
        markerDiv.appendChild(startLabel);

        const endLabel = videojs.dom.createEl("span") as HTMLSpanElement;
        endLabel.className = "marker-time-label end";
        endLabel.textContent = this.formatTime(marker.end_seconds);
        markerDiv.appendChild(endLabel);
      }
    } else {
      // Point marker
      markerDiv.className = "vjs-marker";
      if (duration) {
        markerDiv.style.left = `calc(${(marker.seconds / duration) * 100}% - 3px)`;
      }
    }

    markerDiv.style.visibility = "visible";
    markerDiv.addEventListener("click", () => this.player.currentTime(marker.seconds));

    markerDiv.addEventListener("mouseenter", () => {
      this.showMarkerTooltip(marker.title);
      markerDiv.toggleAttribute("marker-tooltip-shown", true);
    });
    
    markerDiv.addEventListener("mouseout", () => {
      this.hideMarkerTooltip();
      markerDiv.toggleAttribute("marker-tooltip-shown", false);
    });

    const seekBar = this.player.el().querySelector(".vjs-progress-holder");
    if (seekBar) seekBar.appendChild(markerDiv);

    this.markers.push(marker);
    this.markerDivs.push(markerDiv);
  }

  addMarkers(markers: IMarker[]) {
    markers.forEach(this.addMarker, this);
  }

  removeMarker(marker: IMarker) {
    const i = this.markers.indexOf(marker);
    if (i === -1) return;

    this.markers.splice(i, 1);
    const div = this.markerDivs.splice(i, 1)[0];
    if (div.hasAttribute("marker-tooltip-shown")) {
      this.hideMarkerTooltip();
    }
    div.remove();
  }

  removeMarkers(markers: IMarker[]) {
    markers.forEach(this.removeMarker, this);
  }

  clearMarkers() {
    this.removeMarkers([...this.markers]);
  }
}

const style = document.createElement('style');
style.textContent = `
.vjs-marker {
  position: absolute;
  background-color: #fde047;
  width: 6px;
  height: 100%;
  opacity: 0.8;
  cursor: pointer;
  z-index: 1;
  transition: transform 0.2s ease;
}

.vjs-marker-range {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.3);
  height: 100%;
  cursor: pointer;
  z-index: 1;
  transition: transform 0.2s ease;
}

.marker-time-label {
  position: absolute;
  font-size: 10px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 4px;
  border-radius: 2px;
  transform: translateY(-100%);
  white-space: nowrap;
  z-index: 2;
}

.vjs-marker:hover,
.vjs-marker-range:hover {
  transform: translateY(-20px);
  z-index: 2;
}
`;
document.head.appendChild(style);

videojs.registerPlugin("markers", MarkersPlugin);

declare module "video.js" {
  interface VideoJsPlayer {
    markers: () => MarkersPlugin;
  }
  interface VideoJsPlayerPluginOptions {
    markers?: IMarkersOptions;
  }
}

export default MarkersPlugin;