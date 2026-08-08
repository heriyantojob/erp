export const DEFAULT_STAGE_WIDTH = 1080;
export const DEFAULT_STAGE_HEIGHT = 1080;

export interface StageConfigState {
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
}

export const createInitialStageConfig = (
  width: number = DEFAULT_STAGE_WIDTH,
  height: number = DEFAULT_STAGE_HEIGHT
): StageConfigState => ({
  width,
  height,
  baseWidth: width,
  baseHeight: height,
});
