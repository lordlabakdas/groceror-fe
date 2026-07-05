import { useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordStrength } from "./password-strength";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, decodeToken } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errors";

const WRONG_CODE = "That code doesn't match. Check the SMS and try again.";

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
  defaultEntityType?: "user" | "store";
}

// Each value is one screen in the dialog.
type AuthView =
  | "login"
  | "register_phone"    // Step 1: enter phone + pick role
  | "register_otp"      // Step 2: verify OTP
  | "register_password" // Step 3: set password → complete registration
  | "forgot_phone"      // Forgot PW step 1: enter phone
  | "forgot_otp";       // Forgot PW step 2: verify OTP

const TITLES: Record<AuthView, string> = {
  login: "Welcome Back",
  register_phone: "Create Account",
  register_otp: "Verify Your Phone",
  register_password: "Set a Password",
  forgot_phone: "Reset Password",
  forgot_otp: "Enter Verification Code",
};

export function AuthDialog({ isOpen, onOpenChange, defaultTab = "login", defaultEntityType = "user" }: AuthDialogProps) {
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [view, setView] = useState<AuthView>(
    defaultTab === "register" ? "register_phone" : "login",
  );

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  // "user" maps to groceror's entity_type="user" (shopper); "store" = grocer
  const [entityType, setEntityType] = useState<"user" | "store">(defaultEntityType);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Clear any error from the previous screen when navigating between views.
  function switchView(v: AuthView) {
    setFormError(null);
    setView(v);
  }

  function resetAndClose() {
    setPhone("");
    setPassword("");
    setOtp("");
    setEntityType("user");
    setIsLoading(false);
    setFormError(null);
    switchView("login");
    onOpenChange(false);
  }

  // ---- Login ------------------------------------------------------------------

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    try {
      const res = await apiRequest("POST", "/user/login", { phone, password });
      const data = await res.json();
      login(data.token);
      toast({ title: "Logged in", description: "Welcome back!" });
      resetAndClose();
      const decoded = decodeToken(data.token);
      setLocation(decoded?.entityType === "store" ? "/products" : "/stores");
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Register step 1: send OTP ----------------------------------------------

  async function handleRegisterSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    try {
      await apiRequest("POST", "/user/send-otp", { phone });
      switchView("register_otp");
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Register step 2: verify OTP --------------------------------------------

  async function handleRegisterVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    try {
      await apiRequest("POST", "/user/verify-otp", { phone, otp });
      setOtp("");
      switchView("register_password");
    } catch (err) {
      setFormError(friendlyError(err, { 400: WRONG_CODE, 401: WRONG_CODE }));
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Register step 3: register + auto-login ---------------------------------

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      setFormError(null);
      await apiRequest("POST", "/user/register", {
        phone,
        entity_type: entityType,
        password,
      });
      // Auto-login so the user lands in an authenticated state immediately.
      const loginRes = await apiRequest("POST", "/user/login", { phone, password });
      const { token } = await loginRes.json();
      login(token);
      // Create the profile row immediately so the user is visible in the database.
      try {
        await apiRequest("POST", "/user/set-profile", { name: "", email: "" });
      } catch {
        // Non-fatal — user can set their profile later.
      }
      toast({ title: "Account created!", description: "You're now logged in." });
      resetAndClose();
      const decoded = decodeToken(token);
      setLocation(decoded?.entityType === "store" ? "/products" : "/stores");
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Forgot password step 1: send OTP ---------------------------------------

  async function handleForgotSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    try {
      await apiRequest("POST", "/user/send-otp", { phone });
      switchView("forgot_otp");
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Forgot password step 2: verify OTP -------------------------------------
  // Groceror's change-password endpoint requires an active JWT, so a full
  // unauthenticated reset flow needs a backend endpoint.  For now we verify
  // identity via OTP and ask the user to log in then update their password.

  async function handleForgotVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    try {
      await apiRequest("POST", "/user/verify-otp", { phone, otp });
      toast({
        title: "Identity verified",
        description:
          "Please log in with your current password and update it from account settings.",
      });
      setOtp("");
      setPhone("");
      switchView("login");
    } catch (err) {
      setFormError(friendlyError(err, { 400: WRONG_CODE, 401: WRONG_CODE }));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{TITLES[view]}</DialogTitle>
        </DialogHeader>

        {/* ---- LOGIN -------------------------------------------------------- */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-phone">Phone Number</Label>
              <Input
                id="login-phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="link"
                className="px-0 font-normal"
                onClick={() => { setPhone(""); switchView("forgot_phone"); }}
              >
                Forgot password?
              </Button>
            </div>
            <FormError message={formError} />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in…" : "Login"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto px-0 font-normal"
                onClick={() => { setPhone(""); setPassword(""); switchView("register_phone"); }}
              >
                Register
              </Button>
            </p>
          </form>
        )}

        {/* ---- REGISTER STEP 1: phone + role -------------------------------- */}
        {view === "register_phone" && (
          <form onSubmit={handleRegisterSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Phone Number</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>I am a</Label>
              <RadioGroup
                value={entityType}
                onValueChange={(v) => setEntityType(v as "user" | "store")}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="role-user" />
                  <Label htmlFor="role-user">Shopper</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="store" id="role-store" />
                  <Label htmlFor="role-store">Grocer</Label>
                </div>
              </RadioGroup>
            </div>
            <FormError message={formError} />
            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setPhone(""); switchView("login"); }}
              >
                Back to Login
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send OTP"}
              </Button>
            </div>
          </form>
        )}

        {/* ---- REGISTER STEP 2: verify OTP ---------------------------------- */}
        {view === "register_otp" && (
          <form onSubmit={handleRegisterVerifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <strong>{phone}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                <InputOTPGroup>
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <FormError message={formError} />
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => switchView("register_phone")}>
                Back
              </Button>
              <Button type="submit" disabled={isLoading || otp.length < 6}>
                {isLoading ? "Verifying…" : "Verify"}
              </Button>
            </div>
          </form>
        )}

        {/* ---- REGISTER STEP 3: set password -------------------------------- */}
        {view === "register_password" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Phone verified. Set a password for your{" "}
              {entityType === "store" ? "Grocer account" : "Shopper account"}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PasswordStrength password={password} />
            </div>
            <FormError message={formError} />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account…" : "Create Account"}
            </Button>
          </form>
        )}

        {/* ---- FORGOT PASSWORD STEP 1: phone -------------------------------- */}
        {view === "forgot_phone" && (
          <form onSubmit={handleForgotSendOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your phone number and we&apos;ll send a verification code.
            </p>
            <div className="space-y-2">
              <Label htmlFor="forgot-phone">Phone Number</Label>
              <Input
                id="forgot-phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <FormError message={formError} />
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => switchView("login")}>
                Back to Login
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send Code"}
              </Button>
            </div>
          </form>
        )}

        {/* ---- FORGOT PASSWORD STEP 2: verify OTP --------------------------- */}
        {view === "forgot_otp" && (
          <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <strong>{phone}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                <InputOTPGroup>
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <FormError message={formError} />
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => switchView("forgot_phone")}>
                Back
              </Button>
              <Button type="submit" disabled={isLoading || otp.length < 6}>
                {isLoading ? "Verifying…" : "Verify"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
