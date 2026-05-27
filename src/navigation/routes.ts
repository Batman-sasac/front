export type AppStep =
  | 'splash'
  | 'login'
  | 'nickname'
  | 'goal'
  | 'typeIntro'
  | 'typeTest'
  | 'result'
  | 'home'
  | 'league'
  | 'alarm'
  | 'alarmSetting'
  | 'mypage'
  | 'takePicture'
  | 'selectPicture'
  | 'ocrLoading'
  | 'studyIntro'
  | 'talkingStudy'
  | 'scaffolding'
  | 'brushup'
  | 'reward'
  | 'subscribe'
  | 'error';

const FULLSCREEN_STEPS: ReadonlySet<AppStep> = new Set([
  'takePicture',
  'selectPicture',
]);

export const isFullscreenStep = (step: AppStep) => FULLSCREEN_STEPS.has(step);
