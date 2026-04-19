/**
 * app/events/[slug]/register/registration-form.tsx  (Client Component)
 *
 * Multi-section registration form modelled on the COCM Easter Camp Jotform.
 * Sections: Personal Information → Education & Profession → Faith & Church
 *           → Camp Specifics → Financial Aid & Consent
 *
 * Submission:
 *   - Collects all field values via FormData and converts them to a plain object.
 *   - Calls registerForEvent(eventId, formData) — the server action serialises
 *     the payload as JSON into the event_registrations.notes column.
 *   - On success, navigates to /dashboard so the user can see their new registration.
 *
 * Note: HTML `required` attributes are used for basic client-side validation.
 * Server-side validation of individual fields is not yet implemented (Phase 2 scope).
 */
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registerForEvent } from '../../actions';

type RegistrationFormProps = {
  eventId: string;
};

export function RegistrationForm({ eventId }: RegistrationFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    startTransition(async () => {
      const result = await registerForEvent(eventId, data);
      if (!result?.alreadyRegistered) {
        router.push('/dashboard');
      }
    });
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest bg-white';
  const labelClass = 'block text-sm font-medium text-camp-moss mb-1';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="space-y-4">
        <h3 className="border-b pb-2 font-serif text-xl text-camp-forest">Personal Information</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Chinese Name *</label>
            <input type="text" name="chinese_name" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>English Name</label>
            <input
              type="text"
              name="english_name"
              className={inputClass}
              placeholder="If missing, leave blank"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Gender *</label>
            <select name="gender" className={inputClass} required>
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date of Birth *</label>
            <input type="date" name="dob" className={inputClass} required />
          </div>
        </div>

        <div>
          <label className={labelClass}>Status *</label>
          <select name="status" className={inputClass} required>
            <option value="">Select...</option>
            <option value="Student">Student</option>
            <option value="Working">Working / In-service</option>
            <option value="COCM Staff">COCM Staff</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>WeChat ID *</label>
            <input
              type="text"
              name="wechat_id"
              className={inputClass}
              required
              placeholder="Write 'None' if NA"
            />
          </div>
          <div>
            <label className={labelClass}>Phone Number *</label>
            <input type="tel" name="phone" className={inputClass} required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b pb-2 font-serif text-xl text-camp-forest">
          Education & Profession
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>University / School *</label>
            <input type="text" name="university" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Major *</label>
            <input type="text" name="major" className={inputClass} required />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Profession *</label>
            <input type="text" name="profession" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>City *</label>
            <input type="text" name="city" className={inputClass} required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b pb-2 font-serif text-xl text-camp-forest">Faith & Church</h3>
        <div>
          <label className={labelClass}>Attending Church / Fellowship *</label>
          <input type="text" name="church" className={inputClass} required />
        </div>

        <div>
          <label className={labelClass}>Faith Status *</label>
          <select name="faith_status" className={inputClass} required>
            <option value="">Select...</option>
            <option value="Not familiar with Gospel">Not familiar with Gospel</option>
            <option value="Know but not accepted">Know but not accepted</option>
            <option value="Believer, not baptized">Believer, not baptized</option>
            <option value="Baptized 0-3 years">Baptized 0-3 years</option>
            <option value="Baptized 3+ years">Baptized 3+ years</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b pb-2 font-serif text-xl text-camp-forest">Camp Specifics</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>T-Shirt Size *</label>
            <select name="t_shirt_size" className={inputClass} required>
              <option value="">Select...</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="2XL">2XL</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Personality Tendency *</label>
            <select name="personality" className={inputClass} required>
              <option value="">Select...</option>
              <option value="Emotional Extrovert">Emotional Extrovert</option>
              <option value="Emotional Introvert">Emotional Introvert</option>
              <option value="Rational Extrovert">Rational Extrovert</option>
              <option value="Rational Introvert">Rational Introvert</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Food Allergies *</label>
          <input
            type="text"
            name="allergies"
            className={inputClass}
            required
            placeholder="Write 'None' if NA"
          />
        </div>

        <div>
          <label className={labelClass}>Special Accommodations</label>
          <textarea
            name="accommodations"
            className={inputClass}
            rows={2}
            placeholder="Disabilities, anxiety, rooming requests..."
          ></textarea>
        </div>

        <div>
          <label className={labelClass}>Willingness to Serve (Roles)</label>
          <textarea
            name="serve_roles"
            className={inputClass}
            rows={2}
            placeholder="Worship, PA, Logistics, Group Leader..."
          ></textarea>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b pb-2 font-serif text-xl text-camp-forest">
          Financial Aid & Consent
        </h3>
        <div>
          <label className={labelClass}>Applying for Financial Aid? *</label>
          <select name="financial_aid" className={inputClass} required>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <input type="checkbox" id="consent" name="consent" required className="mt-1" />
          <label htmlFor="consent" className="text-sm text-camp-moss">
            I understand that the personal information provided will be used by COCM in accordance
            with the law, solely for the purpose of this camp.
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-4 w-full rounded-full px-6 py-4 text-base font-semibold transition-colors ${
          isPending
            ? 'cursor-wait bg-camp-forest text-white opacity-60'
            : 'bg-camp-forest text-white hover:bg-camp-forest-light'
        }`}
      >
        {isPending ? 'Submitting Registration...' : 'Submit Registration'}
      </button>
    </form>
  );
}
