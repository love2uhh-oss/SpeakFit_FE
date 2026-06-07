import { api } from "./http";
import {
  clearAuthSession as clearStoredAuthSession,
  getStoredUser as getStoredAuthUser,
  saveAuthSession as persistAuthSession,
  updateStoredUser,
  type StoredUserInfo,
} from "./authStorage";
import type { UploadVoiceProfileResponse } from "./voice";
import type { ApiResponse } from "./response";
import { unwrapResponse } from "./response";

const VOICE_ONBOARDING_SEEN_KEY_PREFIX = "sayupai_voice_onboarding_seen";

export type SignUpRequest = {
  email: string;
  birthday: string;
  password: string;
  nickname: string;
  gender: "MALE" | "FEMALE";
  dialect: "STANDARD" | "GYEONGSANG" | "CHUNGCHEONG" | "JEOLLA" | "GANGWON";
  terms: Array<{
    termId: number;
    agreed: boolean;
  }>;
};

type SignUpResponse = {
  userId: number;
  email: string;
  nickname: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: StoredUserInfo;
};

export async function signUp(payload: SignUpRequest) {
  const { data } = await api.post<ApiResponse<SignUpResponse>>(
    "/auth/signup",
    payload
  );

  return unwrapResponse(data, "회원가입에 실패했습니다.");
}

export async function login(payload: LoginRequest) {
  const { data } = await api.post<ApiResponse<LoginResponse>>(
    "/auth/login",
    payload
  );

  return unwrapResponse(data, "로그인에 실패했습니다.");
}

export function getStoredUser(): StoredUserInfo | null {
  return getStoredAuthUser();
}

function isValidVoiceMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function hasDefaultVoice(user: StoredUserInfo | null) {
  if (!user) {
    return false;
  }

  return (
    isValidVoiceMetric(user.defaultVoice?.defaultPitch) &&
    isValidVoiceMetric(user.defaultVoice?.defaultWpm)
  ) || isValidVoiceMetric(user.defaultPitch) || isValidVoiceMetric(user.defaultWpm);
}

export function needsVoiceOnboarding(user: StoredUserInfo | null) {
  return !hasDefaultVoice(user);
}

function withVoiceOnboardingStatus(user: StoredUserInfo): StoredUserInfo {
  return {
    ...user,
    voiceOnboardingRequired: needsVoiceOnboarding(user),
  };
}

export function saveAuthSession(auth: LoginResponse, keepLogin: boolean) {
  persistAuthSession(
    auth.accessToken,
    withVoiceOnboardingStatus(auth.user),
    keepLogin
  );
}

export function saveVoiceOnboardingResult(result: UploadVoiceProfileResponse) {
  const user = getStoredUser();
  const defaultPitch = result.userAverageMetrics?.avgPitch;
  const defaultWpm = result.userAverageMetrics?.avgWPM;

  if (!user || !isValidVoiceMetric(defaultPitch) || !isValidVoiceMetric(defaultWpm)) {
    return;
  }

  updateStoredUser({
    ...user,
    voiceOnboardingRequired: false,
    defaultVoice: {
      ...user.defaultVoice,
      defaultPitch,
      defaultWpm,
    },
  });
}

export function clearAuthSession() {
  clearStoredAuthSession();
}

export async function deleteAccount() {
  const withdrawalPath =
    import.meta.env.VITE_ACCOUNT_WITHDRAWAL_PATH || "/users/me";

  await api.delete(withdrawalPath);
  clearAuthSession();
}

function getVoiceOnboardingSeenKey(userId: number) {
  return `${VOICE_ONBOARDING_SEEN_KEY_PREFIX}_${userId}`;
}

export function hasSeenVoiceOnboarding() {
  const user = getStoredUser();

  if (!user) {
    return false;
  }

  return localStorage.getItem(getVoiceOnboardingSeenKey(user.userId)) === "true";
}

export function markVoiceOnboardingSeen() {
  const user = getStoredUser();

  if (!user) {
    return;
  }

  localStorage.setItem(getVoiceOnboardingSeenKey(user.userId), "true");
}
