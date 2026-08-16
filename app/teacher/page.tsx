"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, type Material } from "@/lib/supabaseClient";
import RequireRole from "@/components/RequireRole";
import LessonView from "@/components/LessonView";

const SUBJECTS = [
  "Математика",
  "Ағылшын тілі",
  "Биология",
  "Орыс тілі",
  "Қазақ тілі",
];

const students = [
  { name: "Айдана Т.", lastScore: 96, status: "Тапсырды" },
  { name: "Мирас Қ.", lastScore: 94, status: "Тапсырды" },
  { name: "Аяжан С.", lastScore: 91, status: "Тапсырды" },
  { name: "Дархан Е.", lastScore: 0, status: "Тапсырмады" },
];

const STORAGE_BUCKET = "materials";

export default function TeacherDashboard() {
  return (
    <RequireRole allow={["teacher"]}>
      <TeacherDashboardContent />
    </RequireRole>
  );
}

function TeacherDashboardContent() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keepExistingFile, setKeepExistingFile] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    setLoading(true);
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Материалдарды жүктеу кезінде қате шықты: " + error.message);
    } else {
      setMaterials(data ?? []);
      setError(null);
    }
    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setSubject(SUBJECTS[0]);
    setDescription("");
    setFile(null);
    setEditingId(null);
    setKeepExistingFile(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(material: Material) {
    setEditingId(material.id);
    setTitle(material.title);
    setSubject(material.subject);
    setDescription(material.description ?? "");
    setFile(null);
    setKeepExistingFile(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadFile(f: File) {
    const safeName = f.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, f, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, name: f.name };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Тақырыпты енгізіңіз.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let file_url: string | null = null;
      let file_name: string | null = null;

      if (file) {
        const uploaded = await uploadFile(file);
        file_url = uploaded.url;
        file_name = uploaded.name;
      }

      if (editingId) {
        const existing = materials.find((m) => m.id === editingId);
        const payload: Partial<Material> = {
          title: title.trim(),
          subject,
          description: description.trim() || null,
        };
        if (file) {
          payload.file_url = file_url;
          payload.file_name = file_name;
        } else if (!keepExistingFile) {
          payload.file_url = null;
          payload.file_name = null;
        } else {
          payload.file_url = existing?.file_url ?? null;
          payload.file_name = existing?.file_name ?? null;
        }

        const { error: updateError } = await supabase
          .from("materials")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase.from("materials").insert({
          title: title.trim(),
          subject,
          description: description.trim() || null,
          file_url,
          file_name,
        });

        if (insertError) throw new Error(insertError.message);
      }

      resetForm();
      await fetchMaterials();
    } catch (err) {
      setError(
        "Сақтау кезінде қате шықты: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateLesson(id: string) {
    setGeneratingId(id);
    setError(null);
    try {
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Белгісіз қате");
      setExpandedId(id);
      await fetchMaterials();
    } catch (err) {
      setError(
        "AI сабақ жасау кезінде қате шықты: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Бұл материалды жойғыңыз келе ме?")) return;
    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("Жою кезінде қате шықты: " + deleteError.message);
      return;
    }
    if (editingId === id) resetForm();
    await fetchMaterials();
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-ink-soft">
            Мұғалім кабинеті
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            Математика тобы
          </h1>
        </div>
        <button className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover">
          + Жаңа тест құру
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-card lg:col-span-1">
          <h2 className="text-[16px] font-semibold text-ink">
            {editingId ? "Материалды өңдеу" : "Материал жүктеу"}
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            PDF, презентация немесе тапсырмалар файлын қосыңыз. AI сабақ
            жасау үшін файл міндетті түрде PDF форматында болуы керек.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                Тақырыбы
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Мысалы: Бөлшектер, 3-тапсырма жинағы"
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                Пән
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-accent"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                Сипаттама (міндетті емес)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Материал туралы қысқаша ақпарат"
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">
                Файл
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line px-3 text-center text-[13px] text-ink-faint hover:bg-paper-tint"
              >
                {file
                  ? file.name
                  : editingId && keepExistingFile
                  ? materials.find((m) => m.id === editingId)?.file_name ??
                    "Файлды осы жерге тастаңыз"
                  : "Файлды осы жерге тастаңыз"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full rounded-full border border-line py-2.5 text-[13px] font-medium text-ink hover:bg-paper-tint"
              >
                Файл таңдау
              </button>

              {editingId &&
                materials.find((m) => m.id === editingId)?.file_url &&
                !file && (
                  <label className="mt-2 flex items-center gap-2 text-[12px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={keepExistingFile}
                      onChange={(e) => setKeepExistingFile(e.target.checked)}
                    />
                    Бұрынғы файлды сақтау
                  </label>
                )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
              >
                {saving
                  ? "Сақталуда..."
                  : editingId
                  ? "Өзгерістерді сақтау"
                  : "Материалды қосу"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-line px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-paper-tint"
                >
                  Бас тарту
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">
              Оқу материалдары
            </h2>
            <span className="text-[12px] text-ink-faint">
              {materials.length} материал
            </span>
          </div>

          {loading ? (
            <p className="mt-5 text-[13px] text-ink-faint">Жүктелуде...</p>
          ) : materials.length === 0 ? (
            <p className="mt-5 text-[13px] text-ink-faint">
              Әзірге материал жоқ. Сол жақтағы форма арқылы қосыңыз.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-line/60">
              {materials.map((m) => (
                <li key={m.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-deep">
                          {m.subject}
                        </span>
                        <p className="font-medium text-ink">{m.title}</p>
                        {m.structuring_status === "done" && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                            AI сабақ дайын
                          </span>
                        )}
                        {m.structuring_status === "processing" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Өңделуде...
                          </span>
                        )}
                        {m.structuring_status === "error" && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            Қате
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="mt-1 text-[13px] text-ink-soft">
                          {m.description}
                        </p>
                      )}
                      {m.file_url && (
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-[12px] text-accent hover:underline"
                        >
                          {m.file_name ?? "Файлды ашу"}
                        </a>
                      )}
                      {m.structuring_status === "error" &&
                        m.structuring_error && (
                          <p className="mt-1 text-[12px] text-red-600">
                            {m.structuring_error}
                          </p>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {m.file_url && (
                        <button
                          onClick={() => handleGenerateLesson(m.id)}
                          disabled={generatingId === m.id}
                          className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-ink/90 disabled:opacity-60"
                        >
                          {generatingId === m.id
                            ? "Дайындалуда..."
                            : m.structuring_status === "done"
                            ? "Қайта жасау"
                            : "AI сабақ жасау"}
                        </button>
                      )}
                      {m.structuring_status === "done" && (
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === m.id ? null : m.id)
                          }
                          className="rounded-full border border-line px-3.5 py-1.5 text-[12px] font-medium text-ink hover:bg-paper-tint"
                        >
                          {expandedId === m.id ? "Жасыру" : "Қарау"}
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(m)}
                        className="rounded-full border border-line px-3.5 py-1.5 text-[12px] font-medium text-ink hover:bg-paper-tint"
                      >
                        Өңдеу
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="rounded-full border border-red-200 px-3.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50"
                      >
                        Жою
                      </button>
                    </div>
                  </div>

                  {expandedId === m.id && m.structured_content && (
                    <div className="mt-4 rounded-xl bg-paper-tint p-4">
                      <LessonView lesson={m.structured_content} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">
            Сәрсенбі тестінің нәтижелері
          </h2>
          <span className="text-[12px] text-ink-faint">4 / 28 оқушы</span>
        </div>
        <table className="mt-5 w-full text-left text-[13px]">
          <thead>
            <tr className="text-[11px] font-medium text-ink-faint">
              <th className="pb-3 font-medium">Оқушы</th>
              <th className="pb-3 font-medium">Бал</th>
              <th className="pb-3 font-medium">Күй</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.name} className="border-t border-line/60">
                <td className="py-3 font-medium text-ink">{s.name}</td>
                <td className="py-3 text-ink">
                  {s.lastScore > 0 ? s.lastScore : "—"}
                </td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                      s.status === "Тапсырды"
                        ? "bg-accent-soft text-accent-deep"
                        : "bg-paper-tint text-ink-faint"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
