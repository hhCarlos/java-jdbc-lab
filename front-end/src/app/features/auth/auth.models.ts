export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Token lifetime in seconds. */
  expiresIn: number;
}

export interface RegisterRequest {
  name: string;
  lastname: string;
  email: string;
  password: string;
}

/** Public user returned on registration; timestamps are ISO 8601 strings with offsets. */
export interface RegistrationResponse {
  id: number;
  name: string;
  lastname: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}
