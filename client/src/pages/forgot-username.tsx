import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const forgotUsernameSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotUsernameForm = z.infer<typeof forgotUsernameSchema>;

export default function ForgotUsernamePage() {
  const { toast } = useToast();

  const forgotUsernameMutation = useMutation({
    mutationFn: async (data: ForgotUsernameForm) => {
      try {
        const response = await fetch("/api/forgot-username", {
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
    onSuccess: () => {
      toast({
        title: "Username Sent",
        description: "Please check your email for your username.",
        variant: "success"
      });
    }
  });

  const form = useForm<ForgotUsernameForm>({
    resolver: zodResolver(forgotUsernameSchema)
  });

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Forgot Username</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => forgotUsernameMutation.mutate(data))}>
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
                <Button type="submit" className="w-full" disabled={forgotUsernameMutation.isPending}>
                  {forgotUsernameMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Username
                </Button>
                {forgotUsernameMutation.error && (
                  <p className="text-sm text-destructive text-center">
                    {forgotUsernameMutation.error.message}
                  </p>
                )}
                <div className="text-center">
                  <Link href="/auth" className="text-sm text-primary hover:underline">
                    Back to Login
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}