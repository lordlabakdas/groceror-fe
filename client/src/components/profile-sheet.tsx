import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Pencil, X, KeyRound, Check } from "lucide-react";

interface MeResponse {
  phone: string;
  entity_type: string;
  name: string | null;
  email: string | null;
  location: string | null;
  website: string | null;
}

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isStore = user?.entityType === "store";

  // ── fetch profile ─────────────────────────────────────────
  const { data: profile, isLoading } = useQuery<MeResponse>({
    queryKey: ["/user/me"],
    enabled: open && !!user,
  });

  // ── edit profile state ────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setLocation(profile.location ?? "");
      setWebsite(profile.website ?? "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/user/set-profile", {
        name,
        email,
        location: location || undefined,
        ...(isStore ? { website } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/user/me"] });
      toast({ title: "Profile updated" });
      setEditing(false);
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // ── change password state ─────────────────────────────────
  const [changingPw, setChangingPw] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const pwMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", "/user/change-password", { new_password: newPassword }),
    onSuccess: () => {
      toast({ title: "Password changed" });
      setChangingPw(false);
      setNewPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  function cancelEdit() {
    setEditing(false);
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setLocation(profile.location ?? "");
      setWebsite(profile.website ?? "");
    }
  }

  const avatarLabel = user?.phone.slice(-4) ?? "••";
  const roleLabel = isStore ? "Store Owner" : "Buyer";
  const hasProfile = profile?.name || profile?.email;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-96 p-0 flex flex-col overflow-y-auto"
      >
        {/* ── header ── */}
        <div
          className="flex flex-col items-center gap-3 px-6 py-10 text-white"
          style={{ background: "linear-gradient(160deg, #0a2614 0%, #166534 100%)" }}
        >
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-bold tracking-tight">
            {avatarLabel}
          </div>
          <div className="text-center">
            {profile?.name ? (
              <p className="text-lg font-semibold">{profile.name}</p>
            ) : null}
            <p className="text-sm text-white/70">{user?.phone}</p>
          </div>
          <Badge className="bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 hover:bg-emerald-500/30">
            {roleLabel}
          </Badge>
        </div>

        <div className="flex flex-col flex-1 px-6 py-6 gap-6">

          {/* ── profile section ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Profile
              </p>
              {!editing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={cancelEdit}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    <Check className="h-3 w-3" />
                    {saveMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {!hasProfile && !editing && (
                  <p className="text-sm text-muted-foreground italic">
                    No profile set yet.{" "}
                    <button
                      className="text-primary underline underline-offset-2"
                      onClick={() => setEditing(true)}
                    >
                      Add your details
                    </button>
                  </p>
                )}

                {(hasProfile || editing) && (
                  <>
                    <Field label="Name" value={name} editing={editing} onChange={setName} placeholder="Your name" />
                    <Field label="Email" value={email} editing={editing} onChange={setEmail} placeholder="your@email.com" type="email" />
                    <Field label="Location" value={location} editing={editing} onChange={setLocation} placeholder="City, Country" />
                    {isStore && (
                      <Field label="Website" value={website} editing={editing} onChange={setWebsite} placeholder="https://mystore.com" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* ── security section ── */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
              Security
            </p>
            {!changingPw ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setChangingPw(true)}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Change Password
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="new-pw" className="text-sm">New Password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setChangingPw(false); setNewPassword(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => pwMutation.mutate()}
                    disabled={!newPassword || pwMutation.isPending}
                  >
                    {pwMutation.isPending ? "Saving…" : "Update Password"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── spacer + logout ── */}
          <div className="mt-auto pt-4">
            <Separator className="mb-4" />
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => { onClose(); logout(); }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── small helper for view/edit field ────────────────────────
function Field({
  label, value, editing, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9"
        />
      ) : (
        <p className="text-sm font-medium min-h-[2rem] flex items-center">
          {value || <span className="text-muted-foreground italic">Not set</span>}
        </p>
      )}
    </div>
  );
}
