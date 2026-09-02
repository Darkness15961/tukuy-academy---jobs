declare module "plyr" {
  export type PlyrEvent = Event & {
    detail: { plyr: PlyrInstance };
  };

  export type PlyrOptions = {
    controls?: string[];
    youtube?: Record<string, string | number | boolean>;
    autoplay?: boolean;
    muted?: boolean;
    seekTime?: number;
    volume?: number;
    ratio?: string;
    clickToPlay?: boolean;
    hideControls?: boolean;
    storage?: { enabled?: boolean; key?: string };
  };

  export type PlyrInstance = {
    play(): Promise<void> | void;
    pause(): void;
    stop(): void;
    destroy(): void;
    on(event: string, callback: (event: PlyrEvent) => void): void;
    off(event: string, callback: (event: PlyrEvent) => void): void;
    currentTime: number;
    duration: number;
    paused: boolean;
    ended: boolean;
    media: HTMLElement | null;
    embed?: {
      getAvailableQualityLevels?: () => string[];
      getPlaybackQuality?: () => string;
      setPlaybackQuality?: (calidad: string) => void;
    };
  };

  export default class Plyr {
    constructor(
      target: string | HTMLElement,
      options?: PlyrOptions,
    );
    play(): Promise<void> | void;
    pause(): void;
    stop(): void;
    destroy(): void;
    on(event: string, callback: (event: PlyrEvent) => void): void;
    off(event: string, callback: (event: PlyrEvent) => void): void;
    currentTime: number;
    duration: number;
    paused: boolean;
    ended: boolean;
    embed?: PlyrInstance["embed"];
  }
}

declare module "plyr/dist/plyr.css";
