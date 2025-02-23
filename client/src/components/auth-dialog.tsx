import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordStrength } from "./password-strength";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AuthDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

type AuthView = "login" | "register" | "forgot_password" | "reset_password";

export function AuthDialog({ isOpen, onOpenChange, defaultTab = "login" }: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [userRole, setUserRole] = useState<"buyer" | "store_owner" | null>(null);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<AuthView>("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement authentication
    onOpenChange(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement forgot password logic
    setView("reset_password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement reset password logic
    setView("login");
    onOpenChange(false);
  };

  const RegisterForm = () => {
    if (!userRole) {
      return (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select your role</Label>
            <RadioGroup
              defaultValue={userRole || undefined}
              onValueChange={(value) => setUserRole(value as "buyer" | "store_owner")}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="buyer" id="buyer" />
                <Label htmlFor="buyer">Buyer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="store_owner" id="store_owner" />
                <Label htmlFor="store_owner">Store Owner</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" placeholder="Enter your full name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Enter your email" required />
        </div>
        {userRole === "buyer" ? (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="Choose a username" required />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="Enter your phone number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="Enter your store address" required />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            placeholder="Create a password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <PasswordStrength password={password} />
        </div>
        <div className="flex justify-between items-center">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => {
              setUserRole(null);
              setPassword("");
            }}
          >
            Back
          </Button>
          <Button type="submit">Register</Button>
        </div>
      </form>
    );
  };

  const ForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input 
          id="reset-email" 
          type="email" 
          placeholder="Enter your email" 
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          required 
        />
      </div>
      <div className="flex justify-between items-center">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => setView("login")}
        >
          Back to Login
        </Button>
        <Button type="submit">Send Reset Link</Button>
      </div>
    </form>
  );

  const ResetPasswordForm = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <Label>Verification Code</Label>
        <InputOTP
          value={otp}
          onChange={(value) => setOtp(value)}
          maxLength={6}
          render={({ slots }) => (
            <InputOTPGroup>
              {slots.map((slot, index) => (
                <InputOTPSlot key={index} {...slot} />
              ))}
            </InputOTPGroup>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input 
          id="new-password" 
          type="password" 
          placeholder="Enter new password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required 
        />
        <PasswordStrength password={password} />
      </div>
      <div className="flex justify-between items-center">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => setView("forgot_password")}
        >
          Back
        </Button>
        <Button type="submit">Reset Password</Button>
      </div>
    </form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setPassword("");
        setResetEmail("");
        setOtp("");
        setView("login");
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {view === "forgot_password" 
              ? "Reset Password" 
              : view === "reset_password"
              ? "Enter New Password"
              : activeTab === "login" 
              ? "Welcome Back" 
              : "Create Account"}
          </DialogTitle>
        </DialogHeader>
        {view === "forgot_password" ? (
          <ForgotPasswordForm />
        ) : view === "reset_password" ? (
          <ResetPasswordForm />
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as "login" | "register");
            setUserRole(null);
            setPassword("");
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="Enter your email" required />
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
                    onClick={() => setView("forgot_password")}
                  >
                    Forgot password?
                  </Button>
                </div>
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}