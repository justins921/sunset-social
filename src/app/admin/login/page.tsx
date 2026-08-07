import { redirect } from "next/navigation";
import Link from "next/link";
import { adminConfigured, isAuthed } from "@/lib/auth";
import { loginAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin sign in" };

export default function AdminLogin({
  searchParams,
}: {
  searchParams: { e?: string };
}) {
  if (adminConfigured() && isAuthed()) redirect("/admin");

  const configured = adminConfigured();
  const error =
    searchParams.e === "bad"
      ? "Incorrect password."
      : searchParams.e === "unconfigured"
        ? "Admin password is not set up yet."
        : null;

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <Link href="/" className="mb-8 text-sm text-slate-400 hover:text-sunset-300">
        ← Back to the site
      </Link>
      <div className="rounded-2xl border border-white/10 bg-dusk-800/50 p-6">
        <h1 className="text-xl font-bold">Secretary sign in</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter the league admin password to post scores.
        </p>

        {!configured ? (
          <div className="mt-5 rounded-xl border border-sunset-500/30 bg-sunset-500/10 p-4 text-sm text-slate-200">
            <p className="font-semibold text-sunset-200">Set up required</p>
            <p className="mt-2">
              Add an <code className="rounded bg-white/10 px-1">ADMIN_PASSWORD</code>{" "}
              environment variable in your Vercel project settings, then redeploy.
              That password unlocks this screen.
            </p>
          </div>
        ) : (
          <form action={loginAction} className="mt-5 space-y-4">
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                className="w-full rounded-lg border border-white/10 bg-dusk-950 px-3 py-2 text-white outline-none focus:border-sunset-400"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-sunset-500 px-4 py-2.5 font-semibold text-white transition hover:bg-sunset-600"
            >
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
