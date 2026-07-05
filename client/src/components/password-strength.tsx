import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const calculateStrength = (password: string): number => {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 25;
    
    // Contains number
    if (/\d/.test(password)) strength += 25;
    
    // Contains lowercase and uppercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    
    // Contains special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;
    
    return strength;
  };

  const getStrengthText = (strength: number): string => {
    if (strength === 0) return "Very Weak";
    if (strength <= 25) return "Weak";
    if (strength <= 50) return "Fair";
    if (strength <= 75) return "Good";
    return "Strong";
  };

  const getStrengthColor = (strength: number): string => {
    if (strength <= 25) return "bg-destructive";
    if (strength <= 50) return "bg-yellow-500";
    if (strength <= 75) return "bg-blue-500";
    return "bg-amber-500";
  };

  const strength = calculateStrength(password);

  return (
    <div className="space-y-2">
      <div className="h-2">
        <Progress 
          value={strength} 
          className={cn("h-2", getStrengthColor(strength))}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Password Strength: {getStrengthText(strength)}
      </p>
    </div>
  );
}
