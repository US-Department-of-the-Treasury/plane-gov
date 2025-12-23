import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
// icons
import { Eye, EyeOff } from "lucide-react";
// plane internal packages
import { API_BASE_URL, E_PASSWORD_STRENGTH } from "@plane/constants";
import { Button } from "@plane/propel/button";
import { AuthService } from "@plane/services";
import { Input, PasswordStrengthIndicator, Spinner } from "@plane/ui";
import { getPasswordStrength } from "@plane/utils";
// components
import { AuthHeader } from "@/app/(all)/(home)/auth-header";
import { Banner } from "@/components/common/banner";
import { FormHeader } from "@/components/instance/form-header";

// service initialization
const authService = new AuthService();

// error codes
enum EErrorCodes {
  INSTANCE_NOT_CONFIGURED = "INSTANCE_NOT_CONFIGURED",
  ADMIN_ALREADY_EXIST = "ADMIN_ALREADY_EXIST",
  REQUIRED_EMAIL_PASSWORD_FIRST_NAME = "REQUIRED_EMAIL_PASSWORD_FIRST_NAME",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
}

type TError = {
  type: EErrorCodes | undefined;
  message: string | undefined;
};

// form data
type TFormData = {
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  password: string;
  confirm_password?: string;
};

const defaultFromData: TFormData = {
  first_name: "",
  last_name: "",
  email: "",
  company_name: "",
  password: "",
};

export function InstanceSetupForm() {
  // search params
  const searchParams = useSearchParams();
  const firstNameParam = searchParams.get("first_name") || undefined;
  const lastNameParam = searchParams.get("last_name") || undefined;
  const companyParam = searchParams.get("company") || undefined;
  const emailParam = searchParams.get("email") || undefined;
  const errorCode = searchParams.get("error_code") || undefined;
  const errorMessage = searchParams.get("error_message") || undefined;
  // state
  const [showPassword, setShowPassword] = useState({
    password: false,
    retypePassword: false,
  });
  const [csrfToken, setCsrfToken] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<TFormData>(defaultFromData);
  const [isPasswordInputFocused, setIsPasswordInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryPasswordInputFocused, setIsRetryPasswordInputFocused] = useState(false);

  const handleShowPassword = (key: keyof typeof showPassword) =>
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleFormChange = (key: keyof TFormData, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (csrfToken === undefined) {
      void authService.requestCSRFToken().then((data) => {
        if (data?.csrf_token) setCsrfToken(data.csrf_token);
        return data;
      });
    }
  }, [csrfToken]);

  // Sync URL params to form state on mount
  const hasInitialized = useMemo(() => {
    const updates: Partial<TFormData> = {};
    if (firstNameParam) updates.first_name = firstNameParam;
    if (lastNameParam) updates.last_name = lastNameParam;
    if (companyParam) updates.company_name = companyParam;
    if (emailParam) updates.email = emailParam;
    return updates;
  }, [firstNameParam, lastNameParam, companyParam, emailParam]);

  useEffect(() => {
    if (Object.keys(hasInitialized).length > 0) {
      setFormData((prev) => ({ ...prev, ...hasInitialized }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived values
  const errorData: TError = useMemo(() => {
    if (errorCode && errorMessage) {
      // Type-safe check if errorCode is a valid EErrorCodes value
      const validCodes = Object.values(EErrorCodes) as string[];
      if (validCodes.includes(errorCode)) {
        return { type: errorCode as EErrorCodes, message: errorMessage };
      }
      return { type: undefined, message: undefined };
    }
    return { type: undefined, message: undefined };
  }, [errorCode, errorMessage]);

  const isButtonDisabled = useMemo(
    () =>
      !isSubmitting &&
      formData.first_name &&
      formData.email &&
      formData.password &&
      getPasswordStrength(formData.password) === E_PASSWORD_STRENGTH.STRENGTH_VALID &&
      formData.password === formData.confirm_password
        ? false
        : true,
    [formData.confirm_password, formData.email, formData.first_name, formData.password, isSubmitting]
  );

  const password = formData?.password ?? "";
  const confirmPassword = formData?.confirm_password ?? "";
  const renderPasswordMatchError = !isRetryPasswordInputFocused || confirmPassword.length >= password.length;

  return (
    <>
      <AuthHeader />
      <div className="flex flex-col justify-center items-center flex-grow w-full py-6 mt-10">
        <div className="relative flex flex-col gap-6 max-w-[22.5rem] w-full">
          <FormHeader
            heading="Setup your Plane Instance"
            subHeading="Post setup you will be able to manage this Plane instance."
          />
          {errorData.type &&
            errorData?.message &&
            ![EErrorCodes.INVALID_EMAIL, EErrorCodes.INVALID_PASSWORD].includes(errorData.type) && (
              <Banner type="error" message={errorData?.message} />
            )}
          <form
            className="space-y-4"
            method="POST"
            action={`${API_BASE_URL}/api/instances/admins/sign-up/`}
            onSubmit={() => setIsSubmitting(true)}
          >
            <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
            {/* Telemetry disabled for government deployment - always false */}
            <input type="hidden" name="is_telemetry_enabled" value="False" />

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full space-y-1">
                <label className="text-13 text-tertiary font-medium" htmlFor="first_name">
                  First name <span className="text-red-500">*</span>
                </label>
                <Input
                  className="w-full border border-subtle !bg-surface-1 placeholder:text-placeholder"
                  id="first_name"
                  name="first_name"
                  type="text"
                  inputSize="md"
                  placeholder="Wilber"
                  value={formData.first_name}
                  onChange={(e) => handleFormChange("first_name", e.target.value)}
                  autoComplete="on"
                />
              </div>
              <div className="w-full space-y-1">
                <label className="text-13 text-tertiary font-medium" htmlFor="last_name">
                  Last name <span className="text-red-500">*</span>
                </label>
                <Input
                  className="w-full border border-subtle !bg-surface-1 placeholder:text-placeholder"
                  id="last_name"
                  name="last_name"
                  type="text"
                  inputSize="md"
                  placeholder="Wright"
                  value={formData.last_name}
                  onChange={(e) => handleFormChange("last_name", e.target.value)}
                  autoComplete="on"
                />
              </div>
            </div>

            <div className="w-full space-y-1">
              <label className="text-13 text-tertiary font-medium" htmlFor="email">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                className="w-full border border-subtle !bg-surface-1 placeholder:text-placeholder"
                id="email"
                name="email"
                type="email"
                inputSize="md"
                placeholder="name@company.com"
                value={formData.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
                hasError={errorData.type && errorData.type === EErrorCodes.INVALID_EMAIL ? true : false}
                autoComplete="on"
              />
              {errorData.type && errorData.type === EErrorCodes.INVALID_EMAIL && errorData.message && (
                <p className="px-1 text-11 text-red-500">{errorData.message}</p>
              )}
            </div>

            <div className="w-full space-y-1">
              <label className="text-13 text-tertiary font-medium" htmlFor="company_name">
                Company name <span className="text-red-500">*</span>
              </label>
              <Input
                className="w-full border border-subtle !bg-surface-1 placeholder:text-placeholder"
                id="company_name"
                name="company_name"
                type="text"
                inputSize="md"
                placeholder="Company name"
                value={formData.company_name}
                onChange={(e) => handleFormChange("company_name", e.target.value)}
              />
            </div>

            <div className="w-full space-y-1">
              <label className="text-13 text-tertiary font-medium" htmlFor="password">
                Set a password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  className="w-full border border-subtle !bg-surface-1 placeholder:text-placeholder"
                  id="password"
                  name="password"
                  type={showPassword.password ? "text" : "password"}
                  inputSize="md"
                  placeholder="New password..."
                  value={formData.password}
                  onChange={(e) => handleFormChange("password", e.target.value)}
                  hasError={errorData.type && errorData.type === EErrorCodes.INVALID_PASSWORD ? true : false}
                  onFocus={() => setIsPasswordInputFocused(true)}
                  onBlur={() => setIsPasswordInputFocused(false)}
                  autoComplete="on"
                />
                {showPassword.password ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-3.5 flex items-center justify-center text-placeholder"
                    onClick={() => handleShowPassword("password")}
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-3.5 flex items-center justify-center text-placeholder"
                    onClick={() => handleShowPassword("password")}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
              {errorData.type && errorData.type === EErrorCodes.INVALID_PASSWORD && errorData.message && (
                <p className="px-1 text-11 text-red-500">{errorData.message}</p>
              )}
              <PasswordStrengthIndicator password={formData.password} isFocused={isPasswordInputFocused} />
            </div>

            <div className="w-full space-y-1">
              <label className="text-13 text-tertiary font-medium" htmlFor="confirm_password">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword.retypePassword ? "text" : "password"}
                  id="confirm_password"
                  name="confirm_password"
                  inputSize="md"
                  value={formData.confirm_password}
                  onChange={(e) => handleFormChange("confirm_password", e.target.value)}
                  placeholder="Confirm password"
                  className="w-full border border-subtle !bg-surface-1 pr-12 placeholder:text-placeholder"
                  onFocus={() => setIsRetryPasswordInputFocused(true)}
                  onBlur={() => setIsRetryPasswordInputFocused(false)}
                />
                {showPassword.retypePassword ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-3.5 flex items-center justify-center text-placeholder"
                    onClick={() => handleShowPassword("retypePassword")}
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-3.5 flex items-center justify-center text-placeholder"
                    onClick={() => handleShowPassword("retypePassword")}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!!formData.confirm_password &&
                formData.password !== formData.confirm_password &&
                renderPasswordMatchError && <span className="text-13 text-red-500">Passwords don{"'"}t match</span>}
            </div>

            {/* Telemetry disabled for government deployment - checkbox removed */}

            <div className="py-2">
              <Button type="submit" size="xl" className="w-full" disabled={isButtonDisabled}>
                {isSubmitting ? <Spinner height="20px" width="20px" /> : "Continue"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
