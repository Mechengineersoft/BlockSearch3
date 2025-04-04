import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits")
});

type OtpForm = z.infer<typeof otpSchema>;

export default function OtpVerificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const tempUserId = params.get('id');
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    if (tempUserId) {
      const params = new URLSearchParams(window.location.search);
      const emailFromUrl = params.get('email');
      if (emailFromUrl) {
        setEmail(decodeURIComponent(emailFromUrl));
      } else {
        fetch(`/api/user-email/${tempUserId}`)
          .then(res => res.json())
          .then(data => setEmail(data.email))
          .catch(error => console.error('Error fetching email:', error));
      }
    }
  }, [tempUserId]);

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: OtpForm & { tempUserId: string }) => {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      // Show success message
      toast({
        title: "Email Verified",
        description: "Your email has been successfully verified. Redirecting...",
        variant: "success"
      });
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  });

  const form = useForm<OtpForm>({
    resolver: zodResolver(otpSchema)
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => verifyOtpMutation.mutate({ ...data, tempUserId }))}>
              {!tempUserId && (
                <p className="text-sm text-destructive mb-4">
                  Invalid verification session. Please try registering again.
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <div className="mb-4">
                    <Label>Email Address</Label>
                    <Input 
                      value={email || ""}
                      readOnly
                      disabled
                      className="bg-muted"
                    />
                  </div>
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
                <Button type="submit" className="w-full" disabled={verifyOtpMutation.isPending}>
                  {verifyOtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify OTP
                </Button>
                {verifyOtpMutation.error && (
                  <p className="text-sm text-destructive text-center">
                    {verifyOtpMutation.error.message}
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