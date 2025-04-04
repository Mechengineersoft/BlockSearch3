import { useState } from "react";
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
import { Link } from "wouter";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

const resetPasswordSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;


export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [showResetForm, setShowResetForm] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      try {
        const response = await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(contentType?.includes("application/json") ? JSON.parse(errorText).error : errorText);
        }
        if (!contentType?.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }
        return response.json();
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "An unexpected error occurred");
      }
    },
    onSuccess: (response) => {
      setUserEmail(form.getValues("email"));
      setResetToken(response.token);
      setShowResetForm(true);
      toast({
        title: "OTP Sent",
        description: "Please check your email for the password reset OTP.",
        variant: "success"
      });
    }
  });

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      try {
        const response = await fetch(`/api/reset-password?token=${resetToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, email: userEmail })
        });
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(contentType?.includes("application/json") ? JSON.parse(errorText).error : errorText);
        }
        if (!contentType?.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }
        return response.json();
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
      setTimeout(() => window.location.href = `/auth?email=${encodeURIComponent(userEmail)}`, 2000);
    }
  });

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {!showResetForm ? (
              <form onSubmit={form.handleSubmit((data) => forgotPasswordMutation.mutate(data))}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      {...form.register("email")} 
                      placeholder="Enter your email address"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={forgotPasswordMutation.isPending}>
                    {forgotPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP
                  </Button>
                  {forgotPasswordMutation.error && (
                    <p className="text-sm text-destructive text-center">
                      {forgotPasswordMutation.error.message}
                    </p>
                  )}
                  <div className="text-center">
                    <Link href="/auth" className="text-sm text-primary hover:underline">
                      Back to Login
                    </Link>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={resetForm.handleSubmit((data) => resetPasswordMutation.mutate(data))}>
                <div className="space-y-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input 
                      value={userEmail}
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
                      {...resetForm.register("otp")} 
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                    {resetForm.formState.errors.otp && (
                      <p className="text-sm text-destructive mt-1">
                        {resetForm.formState.errors.otp.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="password">New Password</Label>
                    <PasswordInput 
                      id="password" 
                      {...resetForm.register("password")} 
                      placeholder="Enter new password"
                    />
                    {resetForm.formState.errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {resetForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <PasswordInput 
                      id="confirmPassword" 
                      {...resetForm.register("confirmPassword")} 
                      placeholder="Confirm new password"
                    />
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive mt-1">
                        {resetForm.formState.errors.confirmPassword.message}
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
                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={() => setShowResetForm(false)} 
                      className="text-sm text-primary hover:underline"
                    >
                      Back to Email Form
                    </button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}