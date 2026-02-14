import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Lock, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";

// Helper: convert Arabic numerals and remove non-digit chars
const toLatinDigits = (value: string) => {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
};

const extractDigits = (value: string) => {
  return toLatinDigits(value).replace(/\D/g, "");
};

// Helper: convert phone number to canonical Egyptian local format (01xxxxxxxxx)
const normalizeEgyptianPhone = (phone: string) => {
  const digits = extractDigits(phone);

  if (digits.startsWith("0020") && digits.length === 14) {
    return `0${digits.slice(4)}`;
  }

  if (digits.startsWith("20") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  if (digits.startsWith("1") && digits.length === 10) {
    return `0${digits}`;
  }

  return digits;
};

const phoneToEmail = (phone: string) => {
  return `${normalizeEgyptianPhone(phone)}@phone.local`;
};

const rawDigitsPhoneToEmail = (phone: string) => {
  const digits = extractDigits(phone);
  return `${digits}@phone.local`;
};

const buildCandidateEmails = (phone: string) => {
  const rawDigits = extractDigits(phone);
  const normalized = normalizeEgyptianPhone(phone);
  const variants = new Set<string>();

  if (normalized) variants.add(normalized);
  if (rawDigits) variants.add(rawDigits);

  if (normalized.startsWith("0") && normalized.length === 11) {
    const withoutLeadingZero = normalized.slice(1); // 10-digit mobile
    variants.add(withoutLeadingZero);
    variants.add(`20${withoutLeadingZero}`);
    variants.add(`0020${withoutLeadingZero}`);
  }

  return [...variants].map((digits) => `${digits}@phone.local`);
};

const loginSchema = z.object({
  phone: z.string().min(10, t("auth.phoneMin")),
  password: z.string().min(6, t("auth.passwordMin")),
});

const signupSchema = z.object({
  fullName: z.string().min(2, t("auth.nameMin")),
  phone: z.string().min(10, t("auth.phoneMin")),
  vodafoneCash: z.string().min(10, t("auth.phoneMin")),
  password: z.string().min(6, t("auth.passwordMin")),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const referralCode = searchParams.get("ref");
  
  // Login form state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupVodafoneCash, setSignupVodafoneCash] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
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

    const normalizedLoginPhone = normalizeEgyptianPhone(loginPhone);
    const validation = loginSchema.safeParse({ phone: normalizedLoginPhone, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedEmail = phoneToEmail(normalizedLoginPhone);
      const legacyEmail = rawDigitsPhoneToEmail(loginPhone);
      const candidateEmails = Array.from(
        new Set([normalizedEmail, legacyEmail, ...buildCandidateEmails(loginPhone)])
      );

      let signedIn = false;
      let lastError: { message: string } | null = null;

      for (const email of candidateEmails) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: loginPassword,
        });

        if (!error) {
          signedIn = true;
          break;
        }

        lastError = error;

        if (!error.message.includes("Invalid login credentials")) {
          toast.error(error.message);
          return;
        }
      }

      if (!signedIn) {
        if (lastError?.message.includes("Invalid login credentials")) {
          toast.error("رقم الهاتف أو كلمة المرور غير صحيحة");
        } else {
          toast.error(lastError?.message || t("auth.unexpectedError"));
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

    const normalizedSignupPhone = normalizeEgyptianPhone(signupPhone);
    const normalizedVodafoneCash = normalizeEgyptianPhone(signupVodafoneCash);
    const validation = signupSchema.safeParse({
      fullName: signupName,
      phone: normalizedSignupPhone,
      vodafoneCash: normalizedVodafoneCash,
      password: signupPassword,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if phone already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('phone_number', normalizedSignupPhone)
        .limit(1);

      if (checkError) {
        console.error("Error checking phone:", checkError);
        toast.error(t("auth.unexpectedError"));
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        toast.error("رقم الهاتف مسجل بالفعل. يرجى تسجيل الدخول.");
        return;
      }

      // Check if Vodafone Cash number already exists
      const { data: existingVodafoneCash, error: vodafoneCheckError } = await supabase
        .from('profiles')
        .select('vodafone_cash')
        .eq('vodafone_cash', normalizedVodafoneCash)
        .limit(1);

      if (vodafoneCheckError) {
        console.error("Error checking Vodafone Cash:", vodafoneCheckError);
        toast.error(t("auth.unexpectedError"));
        return;
      }

      if (existingVodafoneCash && existingVodafoneCash.length > 0) {
        toast.error("رقم محفظة فودافون كاش مسجل بالفعل.");
        return;
      }

      const fakeEmail = phoneToEmail(normalizedSignupPhone);
      
      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: signupName,
            phone_number: normalizedSignupPhone,
            vodafone_cash: normalizedVodafoneCash,
            referral_code: referralCode || null,
          },
        },
      });

      if (error) {
        if (
          error.message.includes("PHONE_NUMBER_ALREADY_EXISTS") ||
          error.message.includes("already registered") ||
          error.message.includes("User already registered")
        ) {
          toast.error("رقم الهاتف مسجل بالفعل. يرجى تسجيل الدخول.");
        } else if (error.message.includes("VODAFONE_CASH_ALREADY_EXISTS")) {
          toast.error("رقم محفظة فودافون كاش مسجل بالفعل.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
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
              src="/favicon.ico"
              alt={t("appName")}
              className="h-full w-full object-contain"
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
                  <Label htmlFor="login-phone">{t("auth.phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-phone"
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder={t("auth.phonePlaceholder")}
                      className="ps-10"
                      dir="ltr"
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
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-vodafone-cash">رقم محفظة للمكافأت</Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-vodafone-cash"
                      type="tel"
                      value={signupVodafoneCash}
                      onChange={(e) => setSignupVodafoneCash(e.target.value)}
                      placeholder="010123456789"
                      className="ps-10"
                      dir="ltr"
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


