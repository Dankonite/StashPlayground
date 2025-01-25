import videojs, { VideoJsPlayer } from "video.js";
import "./markers.css";

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
  private markerDivs: {
    dot: HTMLDivElement;
    range?: HTMLDivElement;
    containedRanges?: HTMLDivElement[];
  }[] = [];
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

  private isMarkerOverlapping(outerMarker: IMarker, innerMarker: IMarker): boolean {
    if (!outerMarker.end_seconds || !innerMarker.end_seconds) return false;
    
    return (
      (innerMarker.seconds >= outerMarker.seconds && innerMarker.seconds <= outerMarker.end_seconds) ||
      (innerMarker.end_seconds >= outerMarker.seconds && innerMarker.end_seconds <= outerMarker.end_seconds) ||
      (innerMarker.seconds <= outerMarker.seconds && innerMarker.end_seconds >= outerMarker.end_seconds)
    );
  }

  addMarker(marker: IMarker) {
    const duration = this.player.duration();
    const markerSet: {
      dot: HTMLDivElement;
      range?: HTMLDivElement;
      containedRanges?: HTMLDivElement[];
    } = {
      dot: videojs.dom.createEl("div") as HTMLDivElement,
      containedRanges: []
    };

    // Create dot marker
    markerSet.dot.className = "vjs-marker-dot";
    if (duration) {
      markerSet.dot.style.left = `calc(${(marker.seconds / duration) * 100}% - 3px)`;
    }

    // Create range marker if end_seconds exists
    if (marker.end_seconds) {
      const rangeDiv = videojs.dom.createEl("div") as HTMLDivElement;
      rangeDiv.className = "vjs-marker-range";
      
      if (duration) {
        const startPercent = (marker.seconds / duration) * 100;
        const endPercent = (marker.end_seconds / duration) * 100;
        const width = endPercent - startPercent;
        
        rangeDiv.style.left = `${startPercent}%`;
        rangeDiv.style.width = `${width}%`;
        rangeDiv.style.display = 'none'; // Initially hidden
        
        const startLabel = videojs.dom.createEl("span") as HTMLSpanElement;
        startLabel.className = "marker-time-label start";
        startLabel.textContent = this.formatTime(marker.seconds);
        rangeDiv.appendChild(startLabel);

        const endLabel = videojs.dom.createEl("span") as HTMLSpanElement;
        endLabel.className = "marker-time-label end";
        endLabel.textContent = this.formatTime(marker.end_seconds);
        rangeDiv.appendChild(endLabel);

        markerSet.range = rangeDiv;
      }
    }

    // Add event listeners to dot
    markerSet.dot.addEventListener("click", () => this.player.currentTime(marker.seconds));

    markerSet.dot.addEventListener("mouseenter", () => {
      this.showMarkerTooltip(marker.title);
      markerSet.dot.toggleAttribute("marker-tooltip-shown", true);
      
      // Show own range marker
      if (markerSet.range) {
        markerSet.range.style.display = 'block';
      }

      // Find and show overlapping markers' ranges
      this.markerDivs.forEach((otherMarkerSet, index) => {
        const otherMarker = this.markers[index];
        
        if (
          otherMarker !== marker && 
          otherMarker.end_seconds && 
          this.isMarkerOverlapping(marker, otherMarker) && 
          otherMarkerSet.range
        ) {
          otherMarkerSet.range.classList.add('contained-marker-range');
          otherMarkerSet.range.style.display = 'block';
          markerSet.containedRanges?.push(otherMarkerSet.range);
        }
      });
    });
    
    markerSet.dot.addEventListener("mouseout", () => {
      this.hideMarkerTooltip();
      markerSet.dot.toggleAttribute("marker-tooltip-shown", false);
      
      // Hide own range marker
      if (markerSet.range) {
        markerSet.range.style.display = 'none';
      }

      // Hide contained markers' ranges
      if (markerSet.containedRanges) {
        markerSet.containedRanges.forEach(rangeDiv => {
          rangeDiv.classList.remove('contained-marker-range');
          rangeDiv.style.display = 'none';
        });
      }
    });

    const seekBar = this.player.el().querySelector(".vjs-progress-holder");
    if (seekBar) {
      seekBar.appendChild(markerSet.dot);
      if (markerSet.range) seekBar.appendChild(markerSet.range);
    }

    this.markers.push(marker);
    this.markerDivs.push(markerSet);
  }

  addMarkers(markers: IMarker[]) {
    markers.forEach(this.addMarker, this);
  }

  removeMarker(marker: IMarker) {
    const i = this.markers.indexOf(marker);
    if (i === -1) return;

    this.markers.splice(i, 1);
    const markerSet = this.markerDivs.splice(i, 1)[0];
    
    if (markerSet.dot.hasAttribute("marker-tooltip-shown")) {
      this.hideMarkerTooltip();
    }
    
    markerSet.dot.remove();
    if (markerSet.range) markerSet.range.remove();
  }

  removeMarkers(markers: IMarker[]) {
    markers.forEach(this.removeMarker, this);
  }

  clearMarkers() {
    this.removeMarkers([...this.markers]);
  }
}

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