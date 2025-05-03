
import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Player } from "@lottiefiles/react-lottie-player";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

const signupSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters",
    }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((value) => value === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const Signup = () => {
  const { signUp, signInWithGoogle, loading } = useAuth();
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  const defaultValues: Partial<SignupFormValues> = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  };

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues,
  });

  const onSubmit = async (data: SignupFormValues) => {
    await signUp(data.email, data.password, data.name);
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google signup error:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden opacity-10">
        <div className="absolute top-1/4 left-1/4 h-32 w-32 rounded-full bg-blue-200 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 h-32 w-32 rounded-full bg-purple-200 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md space-y-6 rounded-2xl bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
        <div className="text-center">
          {/* Lottie Animation */}
          <div className="mx-auto -mt-20 mb-4 h-40 w-40 transition-all duration-500 hover:scale-105">
            <Player
              autoplay
              loop
              src="https://assets2.lottiefiles.com/packages/lf20_ktwnwv5m.json"
              style={{ height: '100%', width: '100%' }}
            />
          </div>
          
          <Link to="/" className="inline-block">
            <h2 className="font-mono text-4xl font-semibold text-gray-800">
              Easy<span className="font-medium text-blue-600">Menu</span>
            </h2>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">Create an account</h1>
          <p className="mt-2 text-gray-600">
            Sign up to get started with EasyMenu
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Jane Doe"
                        className="pl-10 transition-all duration-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="name@example.com"
                        className="pl-10 transition-all duration-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 transition-all duration-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 transition-all duration-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-gray-300 data-[state=checked]:bg-blue-500"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-gray-700">
                      I agree to the{" "}
                      <a
                        href="#"
                        className="font-medium text-blue-600 underline-offset-4 transition-all duration-300 hover:underline hover:text-blue-700"
                      >
                        terms of service
                      </a>{" "}
                      and{" "}
                      <a
                        href="#"
                        className="font-medium text-blue-600 underline-offset-4 transition-all duration-300 hover:underline hover:text-blue-700"
                      >
                        privacy policy
                      </a>
                    </FormLabel>
                    <FormMessage className="text-red-500" />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className={`w-full gap-2 transition-all duration-300 ${isHoveringButton ? 'scale-[1.02] shadow-md' : ''}`}
              disabled={loading}
              onMouseEnter={() => setIsHoveringButton(true)}
              onMouseLeave={() => setIsHoveringButton(false)}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">or continue with</span>
              </div>
            </div>

            <Button 
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 transition-all duration-300 hover:bg-gray-50"
              onClick={handleGoogleSignUp}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <path d="M18.593 8.3c-.3-.84-.713-1.59-1.238-2.24H18.6a7.21 7.21 0 0 1 3.004 5.936c0 1.346-.37 2.603-1.01 3.68l-1.935-.16a13.439 13.439 0 0 0-.234-2.317" />
                <path d="M18.6 6.06h-7.2v4.2h4.067a5.448 5.448 0 0 1-1.536 2.58c-.52.513-1.168.888-1.896 1.117a5.451 5.451 0 0 1-2.164.22 5.395 5.395 0 0 1-2.946-1.184 5.401 5.401 0 0 1-1.884-2.662" />
                <path d="M5.401 9.96a5.367 5.367 0 0 1 2.2-3.15 5.423 5.423 0 0 1 6.2-.37L15.796 4.2a9.78 9.78 0 0 0-7.2-1.166 9.728 9.728 0 0 0-6.173 4.566" />
                <path d="M11.4 20.995a9.796 9.796 0 0 0 6.88-2.693l-3.21-2.693a5.364 5.364 0 0 1-3.67 1.386 5.367 5.367 0 0 1-4.84-3.028L2.4 16.812a9.76 9.76 0 0 0 9 4.183z" />
              </svg>
              Sign up with Google
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="font-medium text-blue-600 underline-offset-4 transition-all duration-300 hover:underline hover:text-blue-700"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Custom CSS using standard style tag - fixed the jsx and global attributes */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Smooth transitions for all elements */
        * {
          transition: all 0.2s ease;
        }
        
        /* Custom focus styles */
        input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        
        /* Animated underline effect */
        .animated-underline {
          position: relative;
        }
        .animated-underline::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background-color: #2563eb;
          transition: width 0.3s ease;
        }
        .animated-underline:hover::after {
          width: 100%;
        }
      `}} />
    </div>
  );
};

export default Signup;
