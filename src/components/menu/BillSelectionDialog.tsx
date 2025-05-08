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
import { Users, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useOrders } from '@/contexts/OrderContext';

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
    // If friendPhoneNumber is filled, try to join that session instead
    if (joinPhoneNumber && /^\d{10}$/.test(joinPhoneNumber)) {
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
        if (error || !data) {
          toast.error("No active session found for this phone number");
          setIsLoading(false);
          return;
        }
        onOpenChange(false);
        navigate(`/menu-preview/${restaurantId}?table=${tableId}&sessionCode=${code}&userName=${encodeURIComponent(userNameInput)}`);
        return;
      } catch (error) {
        toast.error("Failed to join friend's bill. Please try again.");
        setIsLoading(false);
        return;
      }
    }
    // Otherwise, proceed with normal new bill creation
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
            user_name: userNameInput,
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
      if (error) throw error;
      if (!data) {
        toast.error("Invalid or expired session code");
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
      navigate(`/menu-preview/${restaurantId}?table=${tableId}&sessionCode=${code}`);
    } catch (error) {
      console.error("Error joining bill session:", error);
      toast.error("Failed to join bill. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Welcome to Table {tableId}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Please enter your name to continue
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {step === 1 && (
            <div className="grid gap-2">
              <Label htmlFor="user-name">Your Name</Label>
              <Input
                id="user-name"
                placeholder="Enter your name"
                value={userNameInput}
                onChange={(e) => { setUserNameInput(e.target.value); setUserName(e.target.value); }}
                className="text-center"
                disabled={isLoading}
              />
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                maxLength={10}
                disabled={isLoading}
              />
              <Button
                onClick={() => setStep(2)}
                disabled={!userNameInput.trim() || !/^\d{10}$/.test(phoneNumber) || isLoading}
                className="mt-2"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && !joining && (
            <>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                onClick={handleCreateNewBill}
                disabled={isLoading}
              >
                <PlusCircle className="h-8 w-8" />
                <span className="text-lg font-medium">Start New Bill</span>
                <span className="text-sm text-muted-foreground">
                  Create a new bill and invite friends
                </span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setJoining(true)}
                disabled={isLoading}
                className="whitespace-nowrap"
              >
                <Users className="h-4 w-4 mr-2" />
                Join
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="text-xs mt-1"
              >
                Back
              </Button>
            </>
          )}

          {step === 2 && joining && (
            <div className="grid gap-2">
              <Label htmlFor="join-phone-number">Friend's Phone Number</Label>
              <Input
                id="join-phone-number"
                placeholder="Enter friend's phone number"
                value={joinPhoneNumber}
                onChange={e => setJoinPhoneNumber(e.target.value.replace(/\D/g, ""))}
                maxLength={10}
                disabled={isLoading}
              />
              <Button
                onClick={handleJoinBill}
                disabled={isLoading || !userNameInput.trim() || !/^\d{10}$/.test(joinPhoneNumber)}
                className="whitespace-nowrap"
              >
                <Users className="h-4 w-4 mr-2" />
                Join Bill
              </Button>
              <Button
                variant="ghost"
                onClick={() => setJoining(false)}
                disabled={isLoading}
                className="text-xs mt-1"
              >
                Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillSelectionDialog;
