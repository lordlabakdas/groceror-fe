import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DisputeMessage {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface Dispute {
  id: string;
  order_id: string;
  store_id: string;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  messages: DisputeMessage[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  store_responded: { label: "Responded", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  resolved: { label: "Resolved", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground" },
};

const RESOLUTION_LABELS: Record<string, string> = {
  refund: "Refund",
  replacement: "Replacement",
  rejected: "Rejected",
  no_action: "No action",
};

const REASONS = [
  { value: "wrong_item", label: "Wrong item received" },
  { value: "missing_item", label: "Item missing from order" },
  { value: "quality", label: "Poor quality" },
  { value: "damaged", label: "Item arrived damaged" },
  { value: "not_delivered", label: "Order not delivered" },
  { value: "other", label: "Other" },
];

const RESOLUTIONS = [
  { value: "refund", label: "Issue refund" },
  { value: "replacement", label: "Send replacement" },
  { value: "rejected", label: "Reject dispute" },
  { value: "no_action", label: "No action needed" },
];

function OpenDisputeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/disputes", { order_id: orderId.trim(), reason, description }),
    onSuccess: () => {
      setOpen(false);
      setOrderId(""); setReason(""); setDescription("");
      onCreated();
      toast({ title: "Dispute opened", description: "The store will be notified." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message ?? "Could not open dispute", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Report issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Order ID</Label>
            <Input placeholder="Paste your order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the issue in detail…"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!orderId || !reason || !description || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Submitting…" : "Submit dispute"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageThread({ dispute, isStore }: { dispute: Dispute; isStore: boolean }) {
  const [msg, setMsg] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendMsg = useMutation({
    mutationFn: () => apiRequest("POST", `/disputes/${dispute.id}/messages`, { message: msg }),
    onSuccess: () => {
      setMsg("");
      queryClient.invalidateQueries({ queryKey: ["/disputes"] });
    },
    onError: () => toast({ title: "Error", description: "Could not send message", variant: "destructive" }),
  });

  const canMessage = !["resolved", "closed"].includes(dispute.status);

  return (
    <div className="space-y-3 pt-3 border-t">
      {dispute.messages.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No messages yet</p>
      ) : (
        <div className="space-y-2">
          {dispute.messages.map((m) => {
            const mine = isStore ? m.sender_type === "store" : m.sender_type === "shopper";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  <p className="text-[10px] font-medium opacity-70 mb-0.5 capitalize">
                    {m.sender_type}
                  </p>
                  <p>{m.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canMessage && (
        <div className="flex gap-2">
          <Input
            placeholder="Type a message…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && msg.trim()) sendMsg.mutate(); }}
            className="text-sm"
          />
          <Button
            size="icon"
            disabled={!msg.trim() || sendMsg.isPending}
            onClick={() => sendMsg.mutate()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ResolveActions({ dispute }: { dispute: Dispute }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [resolution, setResolution] = useState("");

  const resolveM = useMutation({
    mutationFn: () => apiRequest("PUT", `/disputes/${dispute.id}/resolve`, { resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/disputes"] });
      toast({ title: "Dispute resolved" });
    },
  });

  if (dispute.status === "resolved" || dispute.status === "closed") return null;

  return (
    <div className="flex gap-2 pt-2 border-t">
      <Select value={resolution} onValueChange={setResolution}>
        <SelectTrigger className="text-xs h-8">
          <SelectValue placeholder="Choose resolution…" />
        </SelectTrigger>
        <SelectContent>
          {RESOLUTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!resolution || resolveM.isPending}
        onClick={() => resolveM.mutate()}
        className="h-8 text-xs"
      >
        Resolve
      </Button>
    </div>
  );
}

function CloseAction({ dispute }: { dispute: Dispute }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const closeM = useMutation({
    mutationFn: () => apiRequest("PUT", `/disputes/${dispute.id}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/disputes"] });
      toast({ title: "Dispute closed" });
    },
  });

  if (dispute.status !== "resolved") return null;

  return (
    <div className="pt-2 border-t">
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        onClick={() => closeM.mutate()}
        disabled={closeM.isPending}
      >
        Accept & close
      </Button>
    </div>
  );
}

function DisputeRow({ dispute, isStore }: { dispute: Dispute; isStore: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_LABELS[dispute.status] ?? { label: dispute.status, color: "" };
  const date = new Date(dispute.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
  const reasonLabel = REASONS.find((r) => r.value === dispute.reason)?.label ?? dispute.reason;

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <button
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{reasonLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {date}
            {dispute.resolution && (
              <span className="ml-1.5">· {RESOLUTION_LABELS[dispute.resolution] ?? dispute.resolution}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={cn("text-xs border", meta.color)}>{meta.label}</Badge>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-muted/10">
          <p className="text-sm text-muted-foreground">{dispute.description}</p>
          <p className="text-[11px] text-muted-foreground/60 font-mono">
            Order: {dispute.order_id}
          </p>
          <MessageThread dispute={dispute} isStore={isStore} />
          {isStore && <ResolveActions dispute={dispute} />}
          {!isStore && <CloseAction dispute={dispute} />}
        </div>
      )}
    </div>
  );
}

export default function DisputesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStore = user?.entityType === "store";

  const { data: disputes = [], isLoading } = useQuery<Dispute[]>({
    queryKey: ["/disputes"],
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isStore ? "Incoming Disputes" : "My Disputes"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStore
              ? "Review and respond to shopper disputes"
              : "Track issues you've raised with stores"}
          </p>
        </div>
        {!isStore && (
          <OpenDisputeDialog onCreated={() => queryClient.invalidateQueries({ queryKey: ["/disputes"] })} />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          {isStore ? "No disputes have been raised against your store." : "No disputes yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <DisputeRow key={d.id} dispute={d} isStore={isStore} />
          ))}
        </div>
      )}
    </div>
  );
}
