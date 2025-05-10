import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const SessionCodeDisplay: React.FC = () => {
  const sessionCode = localStorage.getItem("billSessionCode");
  
  if (!sessionCode) return null;

  return (
      <div className="fixed top-2 left-2 z-50">
      <Badge 
           variant="outline" 
             className="bg-purple-50 text-purple-700 border-purple-200 px-2 py-1 text-xs font-medium shadow-sm"
              >
              <Users className="h-3 w-3 mr-1" />
              Phone: {sessionCode}
      </Badge>
      </div>

  );
};

export default SessionCodeDisplay;
