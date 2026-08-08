import Konva from 'konva';

export const exportStageToDataURL = (
  stage: Konva.Stage | null,
  options: { mimeType?: string; quality?: number } = {}
): string | null => {
  if (!stage) return null;
  try {
    return stage.toDataURL({
      mimeType: options.mimeType ?? 'image/png',
      quality: options.quality ?? 1,
      pixelRatio: 2,
    });
  } catch (error) {
    console.error('Failed to export stage', error);
    return null;
  }
};

export default exportStageToDataURL;
