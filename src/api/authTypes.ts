export type SocialProvider = "kakao" | "naver";
export type LoginProvider = SocialProvider | "apple";

export interface LoginResponse {
  status: "success" | "nickname_required" | "NICKNAME_REQUIRED";
  token?: string;
  email: string;
  nickname?: string;
  social_id?: string;
  message?: string;
}

export interface SetNicknameResponse {
  status: "success";
  token: string;
  email: string;
  nickname: string;
  message: string;
}

export interface OAuthConfig {
  kakao_rest_api_key?: string;
  kakao_redirect_uri?: string;
  naver_client_id?: string;
  naver_redirect_uri?: string;
}

export type UserInfoResponse = {
  status: string;
  email: string;
  nickname: string;
  kakao_connected: boolean;
  naver_connected: boolean;
  kakao_email: string | null;
  naver_email: string | null;
};

export type HomeStatsResponse = {
  status: string;
  data: {
    points: number;
    monthly_goal: number | null;
    this_month_count: number;
  };
};

export type UserStatsResponse = {
  status: string;
  data: {
    total_learning_count: number;
    consecutive_days: number;
    monthly_goal: number | null;
    total_points: number;
    is_subscribed: boolean;
  };
};
