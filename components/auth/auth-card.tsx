import Link from 'next/link';

type AuthCardProps = {
  mode: 'sign-in' | 'sign-up';
  action: (formData: FormData) => Promise<void>;
  redirectTo: string;
  status?: 'success' | 'error';
  message?: string;
};

const copyByMode = {
  'sign-in': {
    eyebrow: 'Sign in',
    title: 'Welcome back',
    description:
      'Use your email and password to get back into the camp workspace. Your Supabase session stays active so opening the app from your phone home screen feels much closer to a native app.',
    submit: 'Sign in',
    alternateLabel: "Don't have an account yet?",
    alternateHref: '/sign-up',
    alternateCta: 'Create one',
  },
  'sign-up': {
    eyebrow: 'Sign up',
    title: 'Create your account',
    description:
      'Use your email and a password to create an account for the camp workspace. Once signed in, your session can remain active across normal use on phone and desktop.',
    submit: 'Create account',
    alternateLabel: 'Already have an account?',
    alternateHref: '/sign-in',
    alternateCta: 'Sign in instead',
  },
} as const;

const inputClassName =
  'mt-3 w-full rounded-card border-[1.5px] border-camp-forest/15 bg-white px-4 py-3 text-base text-camp-forest outline-none transition placeholder:text-camp-forest/40 focus:border-camp-moss focus:ring-2 focus:ring-camp-moss/20';

export function AuthCard({ mode, action, redirectTo, status, message }: AuthCardProps) {
  const copy = copyByMode[mode];
  const alertClassName =
    status === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-camp-ember-light bg-camp-ember-light text-camp-forest';

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#d9edf6_0%,_#faf6ee_45%,_#f4e8c1_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-panel bg-white p-8 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-camp-moss">
          {copy.eyebrow}
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight text-camp-forest">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-camp-moss">{copy.description}</p>

        {message ? (
          <div className={`mt-6 rounded-xl border p-4 text-sm ${alertClassName}`}>{message}</div>
        ) : null}

        <form
          action={action}
          className="border-camp-forest/8 mt-8 rounded-card border bg-white p-6 shadow-card"
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />
          {mode === 'sign-up' ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-semibold text-camp-forest"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    placeholder="First name"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-semibold text-camp-forest"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    placeholder="Last name"
                    className={inputClassName}
                  />
                </div>
              </div>

              <label
                htmlFor="preferredName"
                className="mt-5 block text-sm font-semibold text-camp-forest"
              >
                Preferred name <span className="font-normal text-camp-moss">(optional)</span>
              </label>
              <input
                id="preferredName"
                name="preferredName"
                type="text"
                autoComplete="nickname"
                placeholder="What should we call you?"
                className={inputClassName}
              />
            </>
          ) : null}

          <label
            htmlFor="email"
            className={`${mode === 'sign-up' ? 'mt-5' : ''} block text-sm font-semibold text-camp-forest`}
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClassName}
          />

          <label htmlFor="password" className="mt-5 block text-sm font-semibold text-camp-forest">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            placeholder={mode === 'sign-in' ? 'Enter your password' : 'Create a password'}
            className={inputClassName}
          />

          {mode === 'sign-up' ? (
            <p className="mt-4 text-sm text-camp-moss">
              Fields marked optional can be filled in later from your profile.
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 rounded-xl bg-camp-ember px-6 py-3 font-semibold text-white shadow-ember-glow transition-all hover:bg-camp-ember-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-camp-ember/40"
          >
            {copy.submit}
          </button>
        </form>

        <p className="mt-6 text-sm text-camp-moss">
          {copy.alternateLabel}{' '}
          <Link
            href={copy.alternateHref}
            className="font-semibold text-camp-ember underline underline-offset-2"
          >
            {copy.alternateCta}
          </Link>
        </p>
      </div>
    </main>
  );
}
