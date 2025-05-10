import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, PlusCircle, ArrowLeft, Phone, User, QrCode, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useOrders } from '@/contexts/OrderContext';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BillSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  tableId: string;
}

const BillSelectionDialog: React.FC<BillSelectionDialogProps> = ({
  open,
  onOpenChange,
  restaurantId,
  tableId,
}) => {
  const [sessionCode, setSessionCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [userNameInput, setUserNameInput] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinPhoneNumber, setJoinPhoneNumber] = useState("");
  const { setUserName } = useOrders();
  const navigate = useNavigate();

  // Check for existing valid session when dialog opens
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!open) return;

      try {
        // Get device ID from localStorage or generate a new one
        let deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("deviceId", deviceId);
        }

        // Check for existing active session for this device
        const { data: existingSession, error } = await supabase
          .from("bill_sessions")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("table_id", tableId)
          .eq("device_id", deviceId)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned"
          throw error;
        }

        if (existingSession) {
          // Store session info in localStorage
          localStorage.setItem("billSessionId", existingSession.id);
          localStorage.setItem("billSessionCode", existingSession.code);
          localStorage.setItem("billSessionOwner", "true");
          localStorage.setItem("billSessionExpiresAt", existingSession.expires_at);
          localStorage.setItem("userName", existingSession.user_name);

          // Close dialog and navigate to the menu with the existing session code
          onOpenChange(false);
          navigate(`/menu-preview/${restaurantId}?table=${tableId}&sessionCode=${existingSession.code}`);
        }
      } catch (error) {
        console.error("Error checking existing session:", error);
      }
    };

    checkExistingSession();
  }, [open, restaurantId, tableId, navigate, onOpenChange]);

  const generateUniqueSessionCode = async () => {
    // Generate a random 6-character code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code already exists and is not expired
      const { data, error } = await supabase
        .from("bill_sessions")
        .select("code")
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .single();
        
      if (!data) {
        isUnique = true;
      }
    }
    
    return code;
  };

  const handleCreateNewBill = async () => {
    if (!userNameInput.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!/^\d{10}$/.test(phoneNumber)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsLoading(true);
    try {
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("deviceId", deviceId);
      }
      const code = phoneNumber;

      // Check if a session with this phone number already exists and is active
      const { data: existingSession, error: existingError } = await supabase
        .from("bill_sessions")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existingError && existingError.code !== "PGRST116") {
        console.error("Error checking existing session:", existingError);
        throw existingError;
      }

      let sessionData = existingSession;
      if (!existingSession) {
        // Create a new bill session with phone number as code
        const { data, error } = await supabase
          .from("bill_sessions")
          .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            code: code,
            device_id: deviceId,
            is_active: true,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating bill session:', error);
          throw error;
        }
        sessionData = data;
      }

      // Store session info in localStorage
      localStorage.setItem("billSessionId", sessionData.id);
      localStorage.setItem("billSessionCode", code);
      localStorage.setItem("billSessionOwner", "true");
      localStorage.setItem("billSessionExpiresAt", sessionData.expires_at);
      localStorage.setItem("userName", userNameInput);
      localStorage.setItem("phoneNumber", phoneNumber);

      onOpenChange(false);
      navigate(`/menu-preview/${restaurantId}?table=${tableId}&sessionCode=${code}&userName=${encodeURIComponent(userNameInput)}`);
    } catch (error) {
      console.error("Error creating bill session:", error);
      toast.error("Failed to create new bill. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinBill = async () => {
    if (!userNameInput.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!/^\d{10}$/.test(joinPhoneNumber)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setIsLoading(true);
    try {
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("deviceId", deviceId);
      }
      const code = joinPhoneNumber;

      // Check if a session with this phone number exists and is active
      const { data, error } = await supabase
        .from("bill_sessions")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error) {
        console.error("Error checking session:", error);
        if (error.code === "PGRST116") {
          toast.error("No active session found for this phone number. Please ask your friend to start a new bill first.");
        } else {
          toast.error("Failed to check session status. Please try again.");
        }
        return;
      }

      if (!data) {
        toast.error("No active session found for this phone number. Please ask your friend to start a new bill first.");
        return;
      }

      // Store session info in localStorage
      localStorage.setItem("billSessionId", data.id);
      localStorage.setItem("billSessionCode", code);
      localStorage.setItem("billSessionOwner", "false");
      localStorage.setItem("billSessionExpiresAt", data.expires_at);
      localStorage.setItem("userName", userNameInput);
      localStorage.setItem("phoneNumber", joinPhoneNumber);

      onOpenChange(false);
      navigate(`/menu-preview/${restaurantId}?table=${tableId}&sessionCode=${code}&userName=${encodeURIComponent(userNameInput)}`);
    } catch (error) {
      console.error("Error joining bill session:", error);
      toast.error("Failed to join bill. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-to-b from-white to-purple-50 border-purple-100 shadow-xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome to Table {tableId}
          </DialogTitle>
          <DialogDescription className="text-center text-base text-blue-600">
            {/* Enter your name and number to continue */}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="grid gap-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="user-name" className="text-blue-700 font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Your Name
                  </Label>
                  <Input
                    id="user-name"
                    placeholder="Enter your name"
                    value={userNameInput}
                    onChange={(e) => { setUserNameInput(e.target.value); setUserName(e.target.value); }}
                    className="text-center border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number" className="text-blue-700 font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone-number"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                    className="text-center border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!userNameInput.trim() || !/^\d{10}$/.test(phoneNumber) || isLoading}
                  className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && !joining && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <p className="text-sm text-blue-600 font-medium">Start new bill to begin ordering & invite friends</p>
                  <Button
                    variant="outline"
                    className="w-full h-12 flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all duration-200 group"
                    onClick={handleCreateNewBill}
                    disabled={isLoading}
                  >
                    <PlusCircle className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-base font-medium">Start New Bill</span>
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-blue-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-blue-500">
                      Or
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-blue-600 font-medium">Join your friend's bill to order together</p>
                  <Button
                    onClick={() => setJoining(true)}
                    disabled={isLoading}
                    className="w-full h-12 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 transition-all duration-200"
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Join Friends Bill
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="text-xs mt-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all duration-200"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
              </motion.div>
            )}

            {step === 2 && joining && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="join-phone-number" className="text-blue-700 font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Friend's Phone Number
                  </Label>
                  <Input
                    id="join-phone-number"
                    placeholder="Enter friend's phone number"
                    value={joinPhoneNumber}
                    onChange={e => setJoinPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                    className="text-center border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleJoinBill}
                  disabled={isLoading || !userNameInput.trim() || !/^\d{10}$/.test(joinPhoneNumber)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Join Bill
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setJoining(false)}
                  disabled={isLoading}
                  className="text-xs mt-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all duration-200"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillSelectionDialog;
