import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { MessageCircle, Mail, Lock, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";

const loginSchema = z.object({
  email: z.string().email(t("auth.invalidEmail")),
  password: z.string().min(6, t("auth.passwordMin")),
});

const signupSchema = z.object({
  fullName: z.string().min(2, t("auth.nameMin")),
  email: z.string().email(t("auth.invalidEmail")),
  phone: z.string().min(10, t("auth.phoneMin")),
  password: z.string().min(6, t("auth.passwordMin")),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get referral code from URL
  const referralCode = searchParams.get("ref");
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      // Check if there's a redirect destination stored
      const redirectTo = sessionStorage.getItem("redirectAfterAuth");
      if (redirectTo) {
        sessionStorage.removeItem("redirectAfterAuth");
        navigate(redirectTo);
      } else {
        navigate("/");
      }
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(t("auth.invalidCredentials"));
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success(t("auth.loginSuccess"));
      navigate("/");
    } catch (err) {
      toast.error(t("auth.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({
      fullName: signupName,
      email: signupEmail,
      phone: signupPhone,
      password: signupPassword,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupName,
            phone_number: signupPhone,
            referral_code: referralCode || null,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(t("auth.emailExists"));
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // If there's a valid referral code, create the referral record
        if (referralCode && referralCode !== data.user.id) {
          try {
            await supabase.from("referrals").insert({
              inviter_user_id: referralCode,
              invited_user_id: data.user.id,
            });
          } catch (refError) {
            console.error("Failed to save referral:", refError);
            // Don't block signup if referral save fails
          }
        }
        
        toast.success(t("auth.signupSuccess"));
        navigate("/");
      }
    } catch (err) {
      console.error("Signup error:", err);
      toast.error(t("auth.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elegant animate-slide-up">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden bg-card">
            <img
              src="/logo.png"
              alt={t("appName")}
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.src = "/favicon.ico";
              }}
            />
          </div>
          <CardTitle className="font-display text-2xl">{t("appName")}</CardTitle>
          <CardDescription>
            {t("auth.signInTitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gradient-primary"
                >
                  {isSubmitting ? t("auth.signingIn") : t("auth.login")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t("auth.fullName")}</Label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder={t("auth.namePlaceholder")}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">{t("auth.phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder={t("auth.phonePlaceholder")}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="ps-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gradient-primary"
                >
                  {isSubmitting ? t("auth.creatingAccount") : t("auth.signup")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
