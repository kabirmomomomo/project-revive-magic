import React, { useState } from "react";
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
  const navigate = useNavigate();

  const generateUniqueSessionCode = () => {
    // Get current timestamp in milliseconds
    const timestamp = Date.now().toString(36);
    // Generate random string
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    // Combine timestamp and random string
    const uniqueCode = `${randomStr}${timestamp.slice(-3)}`;
    return uniqueCode;
  };

  const handleCreateNewBill = async () => {
    setIsLoading(true);
    try {
      // Generate a unique session code
      const code = generateUniqueSessionCode();
      
      // Create a new bill session
      const { data, error } = await supabase
        .from("bill_sessions")
        .insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          code: code,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Store session info in localStorage
      localStorage.setItem("billSessionId", data.id);
      localStorage.setItem("billSessionCode", data.code);
      localStorage.setItem("billSessionOwner", "true");

      // Close dialog and refresh page to update state
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error("Error creating bill session:", error);
      toast.error("Failed to create new bill. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinBill = async () => {
    if (!sessionCode.trim()) {
      toast.error("Please enter a session code");
      return;
    }

    setIsLoading(true);
    try {
      // Look up the session code
      const { data, error } = await supabase
        .from("bill_sessions")
        .select("*")
        .eq("code", sessionCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Invalid session code");
        return;
      }

      // Store session info in localStorage
      localStorage.setItem("billSessionId", data.id);
      localStorage.setItem("billSessionCode", data.code);
      localStorage.setItem("billSessionOwner", "false");

      // Close dialog and refresh page to update state
      onOpenChange(false);
      window.location.reload();
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
            Please select how you would like to proceed
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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

            <div className="space-y-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillSelectionDialog;
