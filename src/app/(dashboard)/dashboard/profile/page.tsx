import { Questionnaire } from "@/components/profile/questionnaire";
import { Dropzone } from "@/components/upload/dropzone";

export default function ProfilePage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0C1A1C" }}>
          Profile
        </h1>
        <p className="text-sm" style={{ color: "#5A9EA8" }}>
          Upload your CV, cover letter, and supporting documents. HireLoop indexes them for
          tailored applications.
        </p>
      </header>

      <section
        className="rounded-xl border bg-white p-6"
        style={{ borderColor: "#B2EDEC" }}
      >
        <Dropzone />
      </section>

      <section
        className="rounded-xl border bg-white p-6"
        style={{ borderColor: "#B2EDEC" }}
      >
        <header className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: "#0C1A1C" }}>
            Application preferences
          </h2>
          <p className="text-sm" style={{ color: "#5A9EA8" }}>
            HireLoop uses these to tailor every application. Update them anytime.
          </p>
        </header>
        <Questionnaire />
      </section>
    </div>
  );
}
