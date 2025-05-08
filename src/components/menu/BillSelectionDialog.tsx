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
  const [userName, setUserName] = useState("");
  const [showNameInput, setShowNameInput] = useState(true);
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
    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsLoading(true);
    try {
      // Get device ID from localStorage or generate a new one
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("deviceId", deviceId);
      }

      // Generate a unique session code
      const code = await generateUniqueSessionCode();
      
      console.log('Creating new bill session with:', {
        restaurant_id: restaurantId,
        table_id: tableId,
        code,
        device_id: deviceId,
        user_name: userName,
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      });

      // Create a new bill session with expiration
      const { data, error } = await supabase
        .from("bill_sessions")
        .insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          code: code,
          device_id: deviceId,
          user_name: userName,
          is_active: true,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating bill session:', error);
        throw error;
      }

      console.log('Bill session created successfully:', data);

      // Store session info in localStorage
      localStorage.setItem("billSessionId", data.id);
      localStorage.setItem("billSessionCode", data.code);
      localStorage.setItem("billSessionOwner", "true");
      localStorage.setItem("billSessionExpiresAt", data.expires_at);
      localStorage.setItem("userName", userName);

      // Close dialog and navigate to the menu with the new session code
      onOpenChange(false);
      navigate(`/menu-preview/${restaurantId}?table=${tableId}&sessionCode=${data.code}`);
    } catch (error) {
      console.error("Error creating bill session:", error);
      toast.error("Failed to create new bill. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinBill = async () => {
    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!sessionCode.trim()) {
      toast.error("Please enter a session code");
      return;
    }

    setIsLoading(true);
    try {
      // Get device ID from localStorage or generate a new one
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("deviceId", deviceId);
      }

      // Look up the session code and check if it's not expired
      const { data, error } = await supabase
        .from("bill_sessions")
        .select("*")
        .eq("code", sessionCode.toUpperCase())
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
      localStorage.setItem("billSessionCode", data.code);
      localStorage.setItem("billSessionOwner", "false");
      localStorage.setItem("billSessionExpiresAt", data.expires_at);
      localStorage.setItem("userName", userName);

      // Close dialog and navigate to the menu with the session code
      onOpenChange(false);
      navigate(`/menu-preview/${restaurantId}?table=${tableId}&sessionCode=${data.code}`);
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
          {showNameInput ? (
            <div className="grid gap-2">
              <Label htmlFor="user-name">Your Name</Label>
              <Input
                id="user-name"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="text-center"
                disabled={isLoading}
              />
              <Button
                onClick={() => setShowNameInput(false)}
                disabled={!userName.trim() || isLoading}
                className="mt-2"
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
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

              <div>
                <Label htmlFor="session-code">Join Friend's Bill</Label>
                <div className="flex gap-2">
                  <Input
                    id="session-code"
                    placeholder="Enter 6-digit code"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center tracking-widest font-mono"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleJoinBill}
                    disabled={isLoading}
                    className="whitespace-nowrap"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Join
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillSelectionDialog;
