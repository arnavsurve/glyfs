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

export function UpgradePrompt({ open, onOpenChange }: UpgradePromptProps) {
  const handleUpgrade = () => {
    // Placeholder for Stripe redirect
    alert(
      "Pro plan coming soon! Email us at arnav@glyfs.dev for early access and to share what features you'd like.",
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
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
                <h3 className="font-semibold">Free</h3>
                <p className="text-sm text-muted-foreground">Current plan</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="font-medium">3 agents</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="font-medium">9 MCP servers</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="font-medium">3 API keys</span>
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
                  <span>All models</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4" />
                  <span>Usage & cost analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4" />
                  <span>Logs per agent</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4" />
                  <span>Logs per API key</span>
                </div>
              </div>
              <div className="pt-2">
                <p className="font-light">
                  <span className="text-md font-semibold">$0</span>/month
                </p>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="space-y-3 p-4 rounded-lg border border-primary bg-primary/5">
              <div>
                <h3 className="font-semibold flex items-center gap-1">
                  Pro
                  <Crown className="w-4 h-4 text-yellow-500" />
                </h3>
                <p className="text-sm text-muted-foreground">Recommended</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="font-medium">
                    <span className="font-bold">20</span> agents
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="font-medium">
                    <span className="font-bold">100</span> MCP servers
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="font-medium">
                    <span className="font-bold">50</span> API keys
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Basic models</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>API access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>All models</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Usage & cost analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Logs per agent</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Logs per API key</span>
                </div>
              </div>
              <div className="pt-2">
                <p className="font-light">
                  <span className="text-md font-semibold">$9</span>/month
                </p>
              </div>
            </div>
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
