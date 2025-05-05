
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, CheckCircle2, Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface SessionCodeDisplayProps {
  sessionCode: string;
}

const SessionCodeDisplay: React.FC<SessionCodeDisplayProps> = ({ sessionCode }) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  return (
    <div className="fixed top-20 right-4 z-40 bg-purple-700 text-white rounded-full shadow-lg py-2 px-3 flex items-center gap-2 animate-bounce">
      <Users className="h-4 w-4" />
      <span className="font-mono tracking-wider">{sessionCode}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full bg-white/20 text-white hover:bg-white/30 hover:text-white"
              onClick={copyToClipboard}
            >
              {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy bill code</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default SessionCodeDisplay;
