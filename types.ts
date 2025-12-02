export enum EditMode {
  RESTORE = 'RESTORE',
  ENHANCE = 'ENHANCE',
  COLORIZE = 'COLORIZE',
  AGE_CHANGE = 'AGE_CHANGE',
  HEADSHOT = 'HEADSHOT',
  CLOTH_CHANGE = 'CLOTH_CHANGE',
  BG_REMOVE = 'BG_REMOVE',
  BG_CHANGE = 'BG_CHANGE',
  OBJECT_REMOVE = 'OBJECT_REMOVE',
  SKETCH = 'SKETCH',
  CARTOONIFY = 'CARTOONIFY',
}

export enum AgeDirection {
  YOUNGER = 'YOUNGER',
  OLDER = 'OLDER',
  CHILD = 'CHILD',
  ELDERLY = 'ELDERLY',
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  resultImage: string | null;
}

export interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
}