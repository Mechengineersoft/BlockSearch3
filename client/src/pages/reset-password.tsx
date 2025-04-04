import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

const resetPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string(),
  otp: z.string().length(6, "OTP must be 6 digits")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const email = params.get('email');

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      try {
        if (!token) {
          throw new Error("Reset token is missing");
        }
        const response = await fetch(`/api/reset-password?token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: data.password, otp: data.otp })
        });
        const contentType = response.headers.get("content-type");
        const responseText = await response.text();
        
        if (!response.ok) {
          if (contentType?.includes("application/json")) {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.error || "Failed to reset password");
          }
          throw new Error(responseText || "Failed to reset password");
        }
        
        if (!contentType?.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }
        
        return JSON.parse(responseText);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "An unexpected error occurred");
      }
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been successfully reset. Please login with your new password.",
        variant: "success"
      });
      setTimeout(() => setLocation('/auth'), 2000);
    }
  });

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema)
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent>
            <p className="text-center text-destructive">Invalid or expired reset link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => resetPasswordMutation.mutate(data))}>
              <div className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input 
                    value={email || ""}
                    readOnly
                    disabled
                    className="bg-muted"
                    type="text"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input 
                    id="otp" 
                    {...form.register("otp")} 
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  {form.formState.errors.otp && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.otp.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <PasswordInput 
                    id="password" 
                    {...form.register("password")} 
                    placeholder="Enter new password"
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <PasswordInput 
                    id="confirmPassword" 
                    {...form.register("confirmPassword")} 
                    placeholder="Confirm new password"
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
                {resetPasswordMutation.error && (
                  <p className="text-sm text-destructive text-center">
                    {resetPasswordMutation.error.message}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}