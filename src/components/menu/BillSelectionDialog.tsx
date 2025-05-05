
import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Receipt, AlertCircle } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface BillSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  tableId?: string;
}

const BillSelectionDialog: React.FC<BillSelectionDialogProps> = ({
  open,
  onOpenChange,
  restaurantId,
  tableId
}) => {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Generate a unique session code for this bill
  const generateSessionCode = () => {
    // Take first 6 characters of UUID for simplicity
    return uuidv4().substring(0, 6).toUpperCase();
  };

  const handleStartNewBill = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate a session code for others to join
      const sessionCode = generateSessionCode();
      const sessionId = uuidv4();
      
      console.log("Starting new bill with sessionId:", sessionId, "and code:", sessionCode);
      
      // Store this session in localStorage
      localStorage.setItem("billSessionId", sessionId);
      localStorage.setItem("billSessionCode", sessionCode);
      localStorage.setItem("billSessionOwner", "true");
      
      // Store the session in Supabase
      const { error: insertError } = await supabase
        .from("bill_sessions")
        .insert([{
          id: sessionId,
          code: sessionCode,
          restaurant_id: restaurantId,
          table_id: tableId || null,
          is_active: true,
          created_at: new Date().toISOString()
        }]);
        
      if (insertError) {
        console.error("Error inserting bill session:", insertError);
        throw new Error(`Failed to create bill session: ${insertError.message}`);
      }
      
      // Close dialog and continue
      onOpenChange(false);
      
      // Show the session code to the user
      toast.success(`Your bill code is ${sessionCode}. Share it with friends to join this bill.`);
    } catch (err) {
      console.error("Error starting new bill:", err);
      setError("Failed to start a new bill. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinBill = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a join code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Look up the session in Supabase
      const { data, error } = await supabase
        .from("bill_sessions")
        .select("*")
        .eq("code", joinCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();
        
      if (error || !data) {
        throw new Error("Invalid join code or session expired");
      }
      
      // Store this session in localStorage (but not as owner)
      localStorage.setItem("billSessionId", data.id);
      localStorage.setItem("billSessionCode", data.code);
      localStorage.setItem("billSessionOwner", "false");
      
      // Close dialog and continue
      onOpenChange(false);
      
      toast.success(`You've joined bill ${data.code}. Your orders will be added to this bill.`);
      
      // If table ID is different, we need to update the URL
      if (data.table_id && data.table_id !== tableId) {
        const currentParams = Object.fromEntries(searchParams.entries());
        navigate(`/menu-preview/${restaurantId}?${new URLSearchParams({
          ...currentParams,
          table: data.table_id,
          sessionCode: data.code
        }).toString()}`);
      }
    } catch (err) {
      console.error("Error joining bill:", err);
      setError("Invalid join code or session expired");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">How would you like to proceed?</DialogTitle>
          <DialogDescription className="text-center">
            Start a new bill or join a friend's existing bill
          </DialogDescription>
        </DialogHeader>

        {isJoining ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Join Existing Bill</h3>
              <p className="text-sm text-muted-foreground">
                Enter the code shared by your friend to join their bill
              </p>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Enter 6-digit code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-wider font-mono"
                maxLength={6}
              />
              {error && (
                <div className="flex items-center text-sm text-red-500 gap-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="w-1/2" 
                onClick={() => setIsJoining(false)}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                className="w-1/2" 
                onClick={handleJoinBill}
                disabled={isLoading || !joinCode.trim()}
              >
                {isLoading ? "Joining..." : "Join Bill"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 py-4">
            <Button
              size="lg"
              className="w-full py-8 flex flex-col items-center justify-center gap-2"
              onClick={handleStartNewBill}
              disabled={isLoading}
            >
              <Receipt className="h-6 w-6 mb-1" />
              <span className="text-lg font-medium">Start New Bill</span>
              <span className="text-xs font-normal opacity-80">
                Create a new bill for this table
              </span>
            </Button>
            
            <div className="relative py-2">
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
              variant="outline"
              size="lg"
              className="w-full py-8 flex flex-col items-center justify-center gap-2"
              onClick={() => setIsJoining(true)}
              disabled={isLoading}
            >
              <UserPlus className="h-6 w-6 mb-1" />
              <span className="text-lg font-medium">Join Friend's Bill</span>
              <span className="text-xs font-normal opacity-80">
                Enter a code to join an existing bill
              </span>
            </Button>
            
            {error && (
              <div className="flex items-center text-sm text-red-500 gap-1">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BillSelectionDialog;
