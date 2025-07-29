import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Crown, Check, X } from "lucide-react";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: () => void;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  onUpgrade,
}: UpgradePromptProps) {
  const handleUpgrade = () => {
    onOpenChange(false);
    if (onUpgrade) {
      onUpgrade();
    } else {
      // TODO: Navigate to pricing page when implemented
      console.log("Navigate to pricing page");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            You've reached the limit of your free plan. Upgrade to Pro to unlock
            more agents and features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Free Plan */}
            <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
              <div>
                <h3 className="font-semibold">Free Plan</h3>
                <p className="text-sm text-muted-foreground">Current plan</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>3 agents</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Basic models</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>API access</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4" />
                  <span>Advanced models</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4" />
                  <span>Usage analytics</span>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="space-y-3 p-4 rounded-lg border border-primary bg-primary/5">
              <div>
                <h3 className="font-semibold flex items-center gap-1">
                  Pro Plan
                  <Crown className="w-4 h-4 text-yellow-500" />
                </h3>
                <p className="text-sm text-muted-foreground">Recommended</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="font-medium">20 agents</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>All models</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>API access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Advanced models</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Usage analytics</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-center">
              <span className="font-semibold">Pro Plan:</span> $9/month
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade}>
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

