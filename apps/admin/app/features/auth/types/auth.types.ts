export interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
