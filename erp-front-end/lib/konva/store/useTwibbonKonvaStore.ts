import { createWithEqualityFn } from 'zustand/traditional';
import { createInitialStageConfig, StageConfigState } from '@/lib/konva/config';

export interface ImageSize {
  width: number;
  height: number;
}

export interface ImageTransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface UserImageState {
  selectedImageUrl: string | null;
  imageTransform: ImageTransformState;
  mediaType: 'image' | 'video' | null;
  mediaDuration?: number | null;
  mimeType?: string | null;
}

export interface AudioState {
  id?: string;
  name?: string | null;
  src?: string;
  duration?: number | null;
  startTime?: number | null;
  endTime?: number | null;
  volume?: number | null;
  delay?: number | null;
  title?: string | null;
}

export interface TwibbonKonvaState {
  frameUrl?: string;
  frameJsonUrl?: string;
  savedFile: string | null;
  canvasDocument: any;
  pages: any[];
  audios: AudioState[];
  activePageId: string | null;
  previewBase64: string[];
  page: number;
  selectedImageUrl: string | null;
  selectedImageFileName: string;
  selectedImageSize: ImageSize | null;
  stageConfig: StageConfigState;
  imageTransform: ImageTransformState;
  userImages: UserImageState[];
  isLoading: boolean;
  error: string | null;
  setFrameJsonUrl: (url?: string | null) => void;
  setSaveFile: (file: string | null) => void;
  setPages: (pages: any[]) => void;
  setAudios: (audios: AudioState[]) => void;
  setPreviewBase64: (base64List: string[]) => void;
  setPagePreviewImage: (pageIndex: number, previewImage: string | null) => void;
  setActivePageId: (id: string | null) => void;
  setPage: (value: number) => void;
  setFrameUrl: (url?: string | null) => void;
  setSelectedImage: (payload: { url: string; fileName?: string; size?: ImageSize } | null) => void;
  setStageConfig: (payload: Partial<StageConfigState>) => void;
  setImageTransform: (payload: Partial<ImageTransformState>) => void;
  setUserImages: (images: UserImageState[] | ((prev: UserImageState[]) => UserImageState[])) => void;
  setUserImageForPage: (
    pageIndex: number,
    data: Partial<
      Pick<
        UserImageState,
        'selectedImageUrl' | 'imageTransform' | 'mediaType' | 'mediaDuration' | 'mimeType'
      >
    >
  ) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
  saveFile: () => void;
  resetTransform: () => void;
  resetEditor: () => void;
}

const initialStage = createInitialStageConfig();

const createInitialTransform = (stage: StageConfigState): ImageTransformState => ({
  x: stage.width / 2,
  y: stage.height / 2,
  scale: 1,
  rotation: 0,
});

const createEmptyUserImage = (stage: StageConfigState): UserImageState => ({
  selectedImageUrl: null,
  imageTransform: createInitialTransform(stage),
  mediaType: null,
  mediaDuration: null,
  mimeType: null,
});

export const useTwibbonKonvaStore = createWithEqualityFn<TwibbonKonvaState>((set, get) => ({
  frameUrl: undefined,
  frameJsonUrl: undefined,
  savedFile: null,
  canvasDocument: null,
  pages: [],
  audios: [],
  activePageId: null,
  previewBase64: [],
  page: 0,
  selectedImageUrl: null,
  selectedImageFileName: '',
  selectedImageSize: null,
  stageConfig: initialStage,
  imageTransform: createInitialTransform(initialStage),
  userImages: [],
  isLoading: false,
  error: null,
  setFrameUrl: (url) => {
    const next = url ?? undefined;
    if (get().frameUrl === next) return;
    set({
      frameUrl: next,
    });
  },
  setFrameJsonUrl: (url) => {
    const next = url ?? undefined;
    if (get().frameJsonUrl === next) return;
    set({
      frameJsonUrl: next,
    });
  },
  setSaveFile: (file) => {
    if (get().savedFile === file) return;
    set({ savedFile: file });
  },
  setPreviewBase64: (base64List) => {
    set({ previewBase64: base64List });
  },
  setPages: (pages) => {
    set((state) => {
      const nextActiveId =
        pages.find((p) => p.id === state.activePageId)?.id ?? pages[0]?.id ?? null;
      const nextIndex = Math.max(
        0,
        pages.findIndex((p) => p.id === nextActiveId)
      );
      return { pages, activePageId: nextActiveId, page: nextIndex };
    });
  },
  setAudios: (audios) => {
    set({ audios: Array.isArray(audios) ? audios : [] });
  },
  setPagePreviewImage: (pageIndex, previewImage) => {
    set((state) => {
      const page = state.pages?.[pageIndex];
      if (!page) return state;
      if (page.previewImage === previewImage) return state;
      const nextPages = state.pages.map((p, idx) =>
        idx === pageIndex ? { ...p, previewImage } : p
      );
      return { pages: nextPages };
    });
  },
  setActivePageId: (id) => {
    set((state) => {
      const idx = Math.max(
        0,
        state.pages.findIndex((page) => page.id === id)
      );
      return { activePageId: id, page: idx };
    });
  },
  setPage: (value) => {
    if (get().page === value) return;
    set({ page: value });
  },
  setSelectedImage: (payload) => {
    const state = get();
    const pageIndex = Math.max(0, state.page);
    const nextUrl = payload?.url ?? null;
    const nextName = payload?.fileName ?? '';
    const sizeChanged =
      (payload?.size?.width ?? null) !== (state.selectedImageSize?.width ?? null) ||
      (payload?.size?.height ?? null) !== (state.selectedImageSize?.height ?? null);

    if (
      state.selectedImageUrl === nextUrl &&
      state.selectedImageFileName === nextName &&
      !sizeChanged
    ) {
      return;
    }

    const nextTransform =
      payload && state.stageConfig
        ? {
            ...state.imageTransform,
            x: state.stageConfig.width / 2,
            y: state.stageConfig.height / 2,
          }
        : state.imageTransform;

    const userImages = [...state.userImages];
    userImages[pageIndex] = userImages[pageIndex] ?? createEmptyUserImage(state.stageConfig);
    userImages[pageIndex] = {
      ...userImages[pageIndex],
      selectedImageUrl: nextUrl,
      imageTransform: nextTransform,
      mediaType: payload ? 'image' : null,
      mediaDuration: payload ? userImages[pageIndex]?.mediaDuration ?? null : null,
      mimeType: payload ? userImages[pageIndex]?.mimeType ?? null : null,
    };

    set({
      selectedImageUrl: nextUrl,
      selectedImageFileName: nextName,
      selectedImageSize: payload?.size ?? null,
      error: null,
      imageTransform: nextTransform,
      userImages,
    });
  },
  setStageConfig: (payload) => {
    const state = get();
    const nextStage = { ...state.stageConfig, ...payload };
    const stageChanged =
      nextStage.width !== state.stageConfig.width ||
      nextStage.height !== state.stageConfig.height ||
      nextStage.baseWidth !== state.stageConfig.baseWidth ||
      nextStage.baseHeight !== state.stageConfig.baseHeight;

    if (!stageChanged) {
      return;
    }

    set({
      stageConfig: nextStage,
      imageTransform: state.selectedImageUrl
        ? state.imageTransform
        : createInitialTransform(nextStage),
    });
  },
  setImageTransform: (payload) => {
    const state = get();
    const nextTransform = { ...state.imageTransform, ...payload };
    if (
      nextTransform.x === state.imageTransform.x &&
      nextTransform.y === state.imageTransform.y &&
      nextTransform.scale === state.imageTransform.scale &&
      nextTransform.rotation === state.imageTransform.rotation
    ) {
      return;
    }
    const pageIndex = Math.max(0, state.page);
    const userImages = [...state.userImages];
    userImages[pageIndex] = userImages[pageIndex] ?? createEmptyUserImage(state.stageConfig);
    userImages[pageIndex] = {
      ...userImages[pageIndex],
      imageTransform: nextTransform,
    };

    set({
      imageTransform: nextTransform,
      userImages,
    });
  },
  setUserImageForPage: (pageIndex, data) => {
    set((state) => {
      const index = Math.max(0, pageIndex);
      const next = [...state.userImages];
      const current = next[index] ?? createEmptyUserImage(state.stageConfig);
      const nextValue: UserImageState = {
        ...current,
        ...('selectedImageUrl' in data ? { selectedImageUrl: data.selectedImageUrl ?? null } : {}),
        ...('mediaType' in data ? { mediaType: data.mediaType ?? null } : {}),
        ...('mediaDuration' in data
          ? { mediaDuration: data.mediaDuration ?? null }
          : {}),
        ...('mimeType' in data ? { mimeType: data.mimeType ?? null } : {}),
        ...('imageTransform' in data
          ? {
              imageTransform: {
                ...current.imageTransform,
                ...data.imageTransform,
              },
            }
          : {}),
      };

      const noChange =
        nextValue.selectedImageUrl === current.selectedImageUrl &&
        nextValue.imageTransform.x === current.imageTransform.x &&
        nextValue.imageTransform.y === current.imageTransform.y &&
        nextValue.imageTransform.scale === current.imageTransform.scale &&
        nextValue.imageTransform.rotation === current.imageTransform.rotation &&
        nextValue.mediaType === current.mediaType &&
        nextValue.mediaDuration === current.mediaDuration &&
        nextValue.mimeType === current.mimeType;

      if (noChange) {
        return state;
      }

      next[index] = nextValue;
      return { userImages: next };
    });
  },
  setUserImages: (images) => {
    set((state) => ({
      userImages: typeof images === 'function' ? (images as (prev: UserImageState[]) => UserImageState[])(state.userImages) : images,
    }));
  },
  setLoading: (value) => {
    if (get().isLoading === value) return;
    set({ isLoading: value });
  },
  setError: (message) => {
    if (get().error === message) return;
    set({ error: message });
  },
  saveFile: () => {
    const state = get();
    const document = {
      width: state.stageConfig.baseWidth,
      height: state.stageConfig.baseHeight,
      pages: state.pages,
      audios: state.audios,
    };
    const serialized = JSON.stringify(document);
    set({
      canvasDocument: document,
      savedFile: serialized,
    });
  },
  resetTransform: () =>
    set((state) => ({
      imageTransform: createInitialTransform(state.stageConfig),
    })),
  resetEditor: () =>
    set((state) => ({
      selectedImageUrl: null,
      selectedImageFileName: '',
      selectedImageSize: null,
      imageTransform: createInitialTransform(state.stageConfig),
      userImages: [],
      audios: [],
      previewBase64: [],
      error: null,
    })),
}));

export const useTwibbonEditorStore = useTwibbonKonvaStore;
export default useTwibbonKonvaStore;
