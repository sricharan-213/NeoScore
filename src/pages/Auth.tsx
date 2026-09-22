import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, IdCard, ShieldCheck } from "lucide-react";
import { signIn } from "@/lib/session";
import { Brand } from "@/components/Brand";
import { cn } from "@/lib/utils";

const ROLES = ["Registered Nurse", "Neonatal Nurse Practitioner", "Charge Nurse", "Neonatologist"];
const WARDS = ["NICU · Ward A", "NICU · Ward B", "NICU · Ward C"];

export function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = params.get("returnTo") || "/ward";

  const [nurseId, setNurseId] = useState("RN-4012");
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [ward, setWard] = useState(WARDS[0]);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[A-Za-z]{2,4}-\d{3,6}$/.test(nurseId.trim())) {
      setError("Enter a valid staff ID, e.g. RN-4012.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter the name to log against acknowledgements.");
      return;
    }
    signIn({
      nurseId: nurseId.trim().toUpperCase(),
      name: name.trim(),
      role,
      ward,
      signedInAt: Date.now(),
    });
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Context panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-chrome p-10 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <Link to="/" className="relative">
          <Brand onChrome />
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Every alarm carries a name.
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">
            Acknowledgement requires a signed-in staff identity and a one-line note, logged with a
            timestamp. That record is the difference between a monitor and a clinical system.
          </p>
          <ul className="mt-6 space-y-3 text-[12px] text-white/75">
            {[
              "Attributed acknowledgements (staff ID + timestamp)",
              "Ward-scoped alarm queue with mandatory notes",
              "No raw video — derived scores only",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[10px] uppercase tracking-[0.16em] text-white/40">
          Session is held locally for this deployment
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
          </Link>
          <div className="mb-6 lg:hidden">
            <Brand />
          </div>

          <h1 className="text-xl font-semibold tracking-tight">Start of shift</h1>
          <p className="mt-1 text-[12px] text-muted">
            Identify yourself to enter the ward command center.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Staff ID" htmlFor="nurseId">
              <div className="relative">
                <IdCard
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  id="nurseId"
                  value={nurseId}
                  onChange={(e) => {
                    setNurseId(e.target.value);
                    setError("");
                  }}
                  placeholder="RN-4012"
                  className="w-full rounded-lg border border-line bg-panel py-2.5 pl-9 pr-3 font-mono text-[13px] outline-none transition-colors focus:border-accent"
                />
              </div>
            </Field>

            <Field label="Full name" htmlFor="name">
              <input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="A. Okafor"
                autoComplete="name"
                className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-accent"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Role" htmlFor="role">
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-accent"
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ward" htmlFor="ward">
                <select
                  id="ward"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-accent"
                >
                  {WARDS.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </Field>
            </div>

            {error && (
              <p className="rounded-lg border border-risk-severe/40 bg-risk-severe/[0.1] px-3 py-2 text-[11px] text-risk-severe">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-chrome py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Enter command center
            </button>
          </form>

          <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            This deployment stores your session locally so acknowledgements can be attributed. In
            production this is issued by the ward identity provider.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className={cn("mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-muted")}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
