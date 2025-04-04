import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Redirect, Link } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [tempUserId, setTempUserId] = useState<string>();

  interface LoginData extends Pick<InsertUser, 'username' | 'password'> {
    rememberMe: boolean;
  }

  const loginForm = useForm<LoginData>({  // Changed from InsertUser to LoginData
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true }).extend({
      rememberMe: z.boolean().optional().default(false)
    }))
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema)
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const result = await response.json();
      if (result.tempUserId) {
        setTempUserId(result.tempUserId);
      }
      return result;
    }
  });

  if (tempUserId) {
    const email = registerForm.getValues("email");
    return <Redirect to={`/verify-otp?id=${tempUserId}&email=${encodeURIComponent(email)}`} />;
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Sheet Search</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="login-username">Username</Label>
                      <Input id="login-username" {...loginForm.register("username")} />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-destructive mt-1">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <PasswordInput id="login-password" {...loginForm.register("password")} />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive mt-1">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="remember-me"
                        {...loginForm.register("rememberMe")}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="remember-me">Remember me</Label>
                    </div>
                    <div className="flex justify-between items-center">
                      <Link href="/forgot-username" className="text-sm text-black hover:underline">
                        Forgot Username?
                      </Link>
                      <Link href="/forgot-password" className="text-sm text-black hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login
                    </Button>
                    {loginMutation.error && (
                      <p className="text-sm text-destructive text-center">
                        {loginMutation.error.message}
                      </p>
                    )}
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="register-username">Username</Label>
                      <Input id="register-username" {...registerForm.register("username")} />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="register-email">Email</Label>
                      <Input type="email" id="register-email" {...registerForm.register("email")} />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="register-password">Password</Label>
                      <PasswordInput id="register-password" {...registerForm.register("password")} />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Register
                    </Button>
                    {registerMutation.error && (
                      <p className="text-sm text-destructive text-center">
                        {registerMutation.error.message}
                      </p>
                    )}
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <div className="bg-gray-100 flex items-center justify-center p-8">
        <div className="text-left max-w-md">
          <h2 className="text-3xl font-bold mb-4">Sheet Search Portal</h2>
          <p className="text-lg text-gray-700">
            Access and search through your Google Sheets data efficiently. Login or register to get started with our powerful search features.
          </p>
        </div>
      </div>
    </div>
  );
}