import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const SessionCodeDisplay: React.FC = () => {
  const sessionCode = localStorage.getItem("billSessionCode");
  
  if (!sessionCode) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <Badge 
        variant="outline" 
        className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1.5 text-sm font-medium shadow-sm"
      >
        <Users className="h-4 w-4 mr-1.5" />
        Session: {sessionCode}
      </Badge>
    </div>
  );
};

export default SessionCodeDisplay;
