"use client";
import { useEffect, useMemo, useState, useCallback } from "react";

/* ───────── Types & mock data (замените на запросы к Supabase) ───────── */
type Pay = "paid" | "soon" | "overdue";
type Student = { id: number; name: string; phone: string; subject: string; teacher: string; due: string; amount: number; paid: boolean; groupId?: number };
type Group = { id: number; name: string; subject: string; teacher: string; capacity: number };
type Lesson = { id: number; teacher: string; subject: string; room: string; day: string; time: string; groupId?: number };
type Mark = "present" | "absent" | "excused";

const isAdmin = true; // TODO: брать из сессии (role === "admin"). Для остальных ролей UI read-only.
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const SUBJECTS = ["Математика", "Логика", "Қазақ тілі", "English"];
const ROOMS = ["Кабинет 101", "Кабинет 102", "Кабинет 103", "Кабинет 104", "Кабинет 105"]; // в центре всего 5 кабинетов
const TEACHERS = [{ name: "Б. Ахметов", subject: "Математика" }, { name: "А. Омарова", subject: "Логика" }, { name: "Л. Смирнова", subject: "English" }, { name: "Г. Төлеу", subject: "Қазақ тілі" }];
const SLOTS = Array.from({ length: 12 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`); // уроки по 60 мин, 09:00–20:00
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s); d.setDate(d.getDate() + n); return iso(d); };
const TODAY = iso(new Date());

const seedGroups: Group[] = [
  { id: 1, name: "MATH-1 (НИШ)", subject: "Математика", teacher: "Б. Ахметов", capacity: 10 },
  { id: 2, name: "LOGIC-2", subject: "Логика", teacher: "А. Омарова", capacity: 8 },
];
const GID: Record<number, number> = { 1: 1, 4: 1, 2: 2, 6: 2 };
const seedStudents: Student[] = [
  ["Айдана Сериковна", "+7 701 111 22 33", "Математика", "Б. Ахметов", -3, false],
  ["Тимур Нурланов", "+7 702 222 33 44", "Логика", "А. Омарова", 2, false],
  ["Дана Касымова", "+7 705 333 44 55", "English", "Л. Смирнова", 14, true],
  ["Али Жумабеков", "+7 707 444 55 66", "Математика", "Б. Ахметов", 1, false],
  ["Мерей Оспанова", "+7 708 555 66 77", "Қазақ тілі", "Г. Төлеу", 20, true],
  ["Ерасыл Байтен", "+7 747 666 77 88", "Логика", "А. Омарова", -10, false],
].map((r, i) => ({ id: i + 1, name: r[0] as string, phone: r[1] as string, subject: r[2] as string, teacher: r[3] as string, due: addDays(TODAY, r[4] as number), amount: [35000, 30000, 40000, 35000, 28000, 30000][i], paid: r[5] as boolean, groupId: GID[i + 1] }));

const seedLessons: Lesson[] = [
  { id: 1, teacher: "Б. Ахметов", subject: "Математика", room: "Кабинет 101", day: "Пн", time: "16:00", groupId: 1 },
  { id: 2, teacher: "А. Омарова", subject: "Логика", room: "Кабинет 102", day: "Пн", time: "17:00", groupId: 2 },
  { id: 3, teacher: "Л. Смирнова", subject: "English", room: "Кабинет 103", day: "Ср", time: "16:00" },
  { id: 4, teacher: "Г. Төлеу", subject: "Қазақ тілі", room: "Кабинет 104", day: "Ср", time: "18:00" },
];

const payStatus = (s: Student): Pay => {
  const diff = (new Date(s.due).getTime() - new Date(TODAY).getTime()) / 864e5;
  return diff < 0 ? "overdue" : diff <= 3 ? "soon" : "paid";
};
const PAY = {
  paid: { label: "Оплачено", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  soon: { label: "Скоро оплата", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  overdue: { label: "Просрочено", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};
const MARK = {
  present: { label: "Присутствовал", cls: "bg-emerald-500 text-white" },
  absent: { label: "Отсутствовал", cls: "bg-rose-500 text-white" },
  excused: { label: "Уважительная", cls: "bg-amber-400 text-white" },
};

/* ───────── Small UI primitives ───────── */
const Sk = ({ c = "" }: { c?: string }) => <div className={`animate-pulse rounded-lg bg-slate-200/70 ${c}`} />;
const Card = ({ children, c = "" }: { children: React.ReactNode; c?: string }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${c}`}>{children}</div>
);
const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const btn = "rounded-lg px-3 py-1.5 text-sm font-medium transition active:scale-95";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ───────── Inline-ячейка (Excel-режим): сохраняется по blur/Enter, с валидацией ───────── */
function Cell({ value, onSave, validate, type = "text", c = "" }: { value: string | number; onSave: (v: string) => void; validate: (v: string) => string; type?: string; c?: string }) {
  const [v, setV] = useState(String(value));
  const [err, setErr] = useState("");
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    if (v === String(value)) return setErr("");
    const e = validate(v);
    if (e) { setErr(e); return; }
    setErr(""); onSave(v);
  };
  return (
    <div>
      <input type={type} value={v} onChange={(e) => { setV(e.target.value); setErr(""); }} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setV(String(value)); setErr(""); } }}
        className={`w-full rounded px-1.5 py-1 outline-none transition bg-transparent focus:bg-white focus:ring-1 ${err ? "ring-1 ring-rose-400" : "focus:ring-indigo-500"} ${c}`} />
      {err && <p className="px-1.5 text-[11px] text-rose-600">{err}</p>}
    </div>
  );
}

/* ───────── Overview ───────── */
function OverviewTab({ students, lessons, goStudents }: { students: Student[]; lessons: Lesson[]; goStudents: () => void }) {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Позвонить родителям (просрочка)", done: false },
    { id: 2, title: "Сформировать отчёт по выручке за месяц", done: false },
    { id: 3, title: "Проверить замену кабинета на среду", done: true },
  ]);
  const [title, setTitle] = useState("");
  const a = useMemo(() => {
    const od = students.filter((s) => payStatus(s) === "overdue");
    const slots = new Set(lessons.map((l) => `${l.day}${l.time}`)).size;
    return { revenue: students.filter((s) => s.paid).reduce((n, s) => n + s.amount, 0), debt: od.reduce((n, s) => n + s.amount, 0), od: od.length, rooms: new Set(lessons.map((l) => l.room)).size, slots };
  }, [students, lessons]);
  const kpis = [
    ["Выручка (оплачено)", `${a.revenue.toLocaleString("ru-RU")} ₸`, "text-slate-900"],
    ["Задолженность", `${a.debt.toLocaleString("ru-RU")} ₸`, "text-rose-600"],
    ["Должников", `${a.od} из ${students.length}`, "text-rose-600"],
    ["Кабинетов в работе", `${a.rooms} из ${ROOMS.length}`, "text-slate-900"],
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([l, v, cl]) => <Card key={l} c="p-4 transition hover:shadow-md"><p className="text-xs font-medium text-slate-500">{l}</p><p className={`mt-1 text-2xl font-bold ${cl}`}>{v}</p></Card>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card c="p-5">
          <h3 className="mb-3 font-semibold">Задачи <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">{tasks.filter((t) => !t.done).length}</span></h3>
          {tasks.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50">
              <input type="checkbox" checked={t.done} onChange={() => setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} className="h-4 w-4 accent-indigo-600" />
              <span className={`text-sm ${t.done ? "text-slate-400 line-through" : ""}`}>{t.title}</span>
            </label>
          ))}
          <div className="mt-3 flex gap-2">
            <input className={inp} placeholder="Новая задача…" value={title} onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) { setTasks((p) => [...p, { id: Date.now(), title: title.trim(), done: false }]); setTitle(""); } }} />
            <button className={`${btn} bg-slate-900 text-white`} onClick={() => { if (title.trim()) { setTasks((p) => [...p, { id: Date.now(), title: title.trim(), done: false }]); setTitle(""); } }}>+</button>
          </div>
        </Card>
        <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 p-5 text-white shadow-lg">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Оплата</p>
            <h3 className="mt-1 text-lg font-semibold">{a.od ? `${a.od} учеников с просрочкой` : "Просрочек нет"}</h3>
            <p className="mt-1 text-sm text-indigo-200">Откройте список учеников с фильтром «Просрочено» и свяжитесь с родителями.</p>
          </div>
          <button className={`${btn} mt-4 bg-indigo-500 py-2.5 hover:bg-indigo-400`} onClick={goStudents}>Перейти к ученикам</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Students ───────── */
function StudentsTab({ students, setStudents, toast, q, setQ }: any) {
  const [status, setStatus] = useState("all");
  const [subject, setSubject] = useState("all");
  const [edit, setEdit] = useState<Student | null>(null);
  const [date, setDate] = useState("");
  const [err, setErr] = useState("");

  const rows = useMemo(() => students.filter((s: Student) =>
    s.name.toLowerCase().includes(q.toLowerCase()) &&
    (status === "all" || payStatus(s) === status) &&
    (subject === "all" || s.subject === subject)), [students, q, status, subject]);

  const patch = (id: number, d: Partial<Student>, msg: string) => { setStudents((p: Student[]) => p.map((x) => (x.id === id ? { ...x, ...d } : x))); toast(msg); };
  const markPaid = (s: Student) => {
    const next = addDays(s.due < TODAY ? TODAY : s.due, 30);
    setStudents((p: Student[]) => p.map((x) => (x.id === s.id ? { ...x, paid: true, due: next } : x)));
    toast(`Оплата отмечена: ${s.name}. Следующая — ${next}`);
  };
  const saveDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(+new Date(date))) return setErr("Укажите корректную дату");
    setStudents((p: Student[]) => p.map((x) => (x.id === edit!.id ? { ...x, due: date, paid: false } : x)));
    setEdit(null); toast("Дата оплаты обновлена");
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input className={inp} placeholder="Поиск по имени…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inp + " sm:w-48"} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Все статусы</option>
          {Object.entries(PAY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={inp + " sm:w-44"} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="all">Все предметы</option>
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Card c="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>{["ФИО", "Контакты", "Предмет", "Преподаватель", "Сумма ₸", "Оплата до", "Статус", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((s: Student) => { const p = PAY[payStatus(s)]; return (
              <tr key={s.id} className="border-b border-slate-50 transition hover:bg-slate-50/80">
                <td className="px-2 py-2 font-medium text-slate-900"><Cell value={s.name} validate={(v) => (v.trim().length < 2 ? "Минимум 2 символа" : "")} onSave={(v) => patch(s.id, { name: v.trim() }, "Имя обновлено")} /></td>
                <td className="px-2 py-2 text-slate-600"><Cell value={s.phone} c="font-mono text-xs" validate={(v) => (/^\+?[\d\s()-]{10,18}$/.test(v) ? "" : "Неверный номер")} onSave={(v) => patch(s.id, { phone: v.trim() }, "Контакт обновлён")} /></td>
                <td className="px-4 py-3">{s.subject}</td>
                <td className="px-4 py-3 text-slate-600">{s.teacher}</td>
                <td className="px-2 py-2"><Cell value={s.amount} type="number" c="w-24 font-mono text-xs" validate={(v) => (Number(v) > 0 ? "" : "Сумма > 0")} onSave={(v) => patch(s.id, { amount: Number(v) }, "Сумма обновлена")} /></td>
                <td className="px-4 py-3 tabular-nums">{s.due}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${p.cls}`}>{p.label}</span></td>
                <td className="space-x-1 px-4 py-3 text-right whitespace-nowrap">
                  <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={() => markPaid(s)}>Оплачено</button>
                  <button className={`${btn} border border-slate-200 hover:bg-slate-100`} onClick={() => { setEdit(s); setDate(s.due); setErr(""); }}>Дата</button>
                </td>
              </tr>); })}
            {!rows.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Ничего не найдено</td></tr>}
          </tbody>
        </table>
      </Card>
      {edit && (
        <Modal title={`Дата оплаты — ${edit.name}`} onClose={() => setEdit(null)}>
          <input type="date" className={inp} value={date} onChange={(e) => { setDate(e.target.value); setErr(""); }} />
          {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button className={`${btn} hover:bg-slate-100`} onClick={() => setEdit(null)}>Отмена</button>
            <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={saveDate}>Сохранить</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ───────── Schedule: сетка 5 кабинетов × время, клик по ячейке ───────── */
function ScheduleTab({ lessons, setLessons, groups, toast }: any) {
  const [day, setDay] = useState("Пн");
  const [form, setForm] = useState<Partial<Lesson> | null>(null);
  const [err, setErr] = useState("");
  const clash = (f: Partial<Lesson>) => {
    for (const l of lessons as Lesson[]) {
      if (l.id === f.id || l.day !== f.day || l.time !== f.time) continue;
      if (l.room === f.room) return `${l.room} занят: ${l.teacher} (${l.subject})`;
      if (f.teacher && l.teacher === f.teacher) return `${l.teacher} в это время ведёт урок в ${l.room}`;
    }
    return "";
  };
  const set = (p: Partial<Lesson>) => { setForm({ ...form!, ...p }); setErr(""); };
  const live = form ? clash(form) : "";
  const save = () => {
    if (!form!.teacher) return setErr("Выберите преподавателя");
    if (live) return setErr(live);
    setLessons((p: Lesson[]) => form!.id ? p.map((x) => (x.id === form!.id ? (form as Lesson) : x)) : [...p, { ...(form as Lesson), id: Date.now() }]);
    toast(form!.id ? "Урок обновлён" : `Урок добавлен: ${form!.room}, ${form!.day} ${form!.time}`); setForm(null);
  };
  const del = () => { setLessons((p: Lesson[]) => p.filter((x) => x.id !== form!.id)); toast("Урок удалён"); setForm(null); };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {DAYS.map((d) => <button key={d} onClick={() => setDay(d)} className={`${btn} ${day === d ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white hover:bg-slate-100"}`}>{d}</button>)}
        <span className="ml-2 text-xs text-slate-500">{isAdmin ? "Нажмите на ячейку, чтобы назначить или изменить урок" : "Режим просмотра: редактирует только администратор"}</span>
      </div>
      <Card c="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="w-16 px-3 py-2 text-left font-medium">Время</th>{ROOMS.map((r) => <th key={r} className="px-2 py-2 text-left font-medium">{r}</th>)}</tr></thead>
          <tbody>
            {SLOTS.map((t) => (
              <tr key={t} className="border-b border-slate-50">
                <td className="px-3 py-1 align-top text-xs tabular-nums text-slate-400">{t}</td>
                {ROOMS.map((r) => {
                  const l: Lesson | undefined = lessons.find((x: Lesson) => x.day === day && x.room === r && x.time === t);
                  const g = l?.groupId ? groups.find((x: Group) => x.id === l.groupId) : null;
                  return (
                    <td key={r} className="p-1 align-top">
                      <button disabled={!isAdmin} onClick={() => { setForm(l ? { ...l } : { day, room: r, time: t, teacher: "", subject: "" }); setErr(""); }}
                        className={`h-12 w-full rounded-lg px-2 text-left text-xs transition ${l ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200 hover:bg-indigo-100" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"}`}>
                        {l ? <><b className="block truncate">{l.teacher}</b><span className="block truncate text-indigo-600">{g ? g.name : l.subject}</span></> : "+"}
                      </button>
                    </td>);
                })}
              </tr>))}
          </tbody>
        </table>
      </Card>
      {form && (
        <Modal title={form.id ? "Изменить урок" : "Новый урок"} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-500">Группа (необязательно)</label>
              <select className={inp} value={form.groupId ?? ""} onChange={(e) => { const g = groups.find((x: Group) => x.id === +e.target.value); set(g ? { groupId: g.id, teacher: g.teacher, subject: g.subject } : { groupId: undefined }); }}>
                <option value="">Без группы</option>{groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select></div>
            <div><label className="text-xs text-slate-500">Кто ведёт урок</label>
              <select className={inp} value={form.teacher} onChange={(e) => set({ teacher: e.target.value, subject: TEACHERS.find((t) => t.name === e.target.value)?.subject ?? "" })}>
                <option value="">Выберите преподавателя…</option>{TEACHERS.map((t) => <option key={t.name} value={t.name}>{t.name} · {t.subject}</option>)}
              </select></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-slate-500">День</label><select className={inp} value={form.day} onChange={(e) => set({ day: e.target.value })}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div><label className="text-xs text-slate-500">Время</label><select className={inp} value={form.time} onChange={(e) => set({ time: e.target.value })}>{SLOTS.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label className="text-xs text-slate-500">Кабинет</label><select className={inp} value={form.room} onChange={(e) => set({ room: e.target.value })}>{ROOMS.map((r) => <option key={r}>{r}</option>)}</select></div>
            </div>
            {(live || err) && <p className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">⚠ {err || live}</p>}
          </div>
          <div className="mt-4 flex justify-between">
            {form.id ? <button className={`${btn} text-rose-600 hover:bg-rose-50`} onClick={del}>Удалить</button> : <span />}
            <div className="flex gap-2"><button className={`${btn} hover:bg-slate-100`} onClick={() => setForm(null)}>Отмена</button><button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={save}>Сохранить</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ───────── Groups: состав берётся из student.groupId (единый источник правды) ───────── */
function GroupsTab({ groups, setGroups, students, setStudents, lessons, toast }: any) {
  const [add, setAdd] = useState<Group | null>(null);
  const [pick, setPick] = useState("");
  const [create, setCreate] = useState(false);
  const [f, setF] = useState({ name: "", subject: SUBJECTS[0], capacity: "10" });
  const [err, setErr] = useState("");
  const members = (g: Group) => students.filter((s: Student) => s.groupId === g.id);
  const free = (g: Group) => students.filter((s: Student) => !s.groupId && s.subject === g.subject);

  const addStudent = () => {
    if (!add || !pick) return setErr("Выберите ученика");
    if (members(add).length >= add.capacity) return setErr("Группа заполнена");
    const st = students.find((x: Student) => x.id === +pick);
    setStudents((p: Student[]) => p.map((x) => (x.id === +pick ? { ...x, groupId: add.id, teacher: add.teacher } : x)));
    toast(`${st.name} добавлен(а) в ${add.name}`); setAdd(null); setPick(""); setErr("");
  };
  const remove = (st: Student, g: Group) => { setStudents((p: Student[]) => p.map((x) => (x.id === st.id ? { ...x, groupId: undefined } : x))); toast(`${st.name} удалён(а) из ${g.name}`); };
  const createGroup = () => {
    const cap = Number(f.capacity);
    if (f.name.trim().length < 3) return setErr("Название — минимум 3 символа");
    if (groups.some((g: Group) => g.name.toLowerCase() === f.name.trim().toLowerCase())) return setErr("Группа с таким названием уже есть");
    if (!Number.isInteger(cap) || cap < 2 || cap > 20) return setErr("Вместимость от 2 до 20");
    const teacher = TEACHERS.find((t) => t.subject === f.subject)!.name;
    setGroups((p: Group[]) => [...p, { id: Date.now(), name: f.name.trim(), subject: f.subject, teacher, capacity: cap }]);
    toast("Группа создана"); setCreate(false); setF({ name: "", subject: SUBJECTS[0], capacity: "10" }); setErr("");
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Групповые занятия</h2>
        <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => { setCreate(true); setErr(""); }}>+ Создать группу</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g: Group) => { const m = members(g); const times = lessons.filter((l: Lesson) => l.groupId === g.id); return (
          <Card key={g.id} c="p-5">
            <div className="flex items-start justify-between">
              <div><h3 className="font-semibold">{g.name}</h3><p className="text-xs text-slate-500">{g.subject} · {g.teacher}</p></div>
              <button disabled={m.length >= g.capacity} onClick={() => { setAdd(g); setPick(""); setErr(""); }} className={`${btn} bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40`}>+ Ученик</button>
            </div>
            <p className="mt-2 text-xs text-slate-600">{times.length ? times.map((l: Lesson) => `${l.day} ${l.time} · ${l.room}`).join(" • ") : "Расписание не назначено"}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(m.length / g.capacity) * 100}%` }} /></div>
            <p className="mt-1 text-xs text-slate-500">{m.length} / {g.capacity} мест</p>
            <table className="mt-3 w-full text-sm">
              <tbody>{m.map((st: Student) => { const pp = PAY[payStatus(st)]; return (
                <tr key={st.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{st.name}</td>
                  <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${pp.cls}`}>{pp.label}</span></td>
                  <td className="py-2 text-right"><button className="text-xs text-slate-400 transition hover:text-rose-600" onClick={() => remove(st, g)}>Убрать</button></td>
                </tr>); })}
                {!m.length && <tr><td className="py-4 text-center text-xs text-slate-400">В группе пока никого нет</td></tr>}
              </tbody>
            </table>
          </Card>); })}
      </div>
      {add && (
        <Modal title={`Добавить в ${add.name}`} onClose={() => setAdd(null)}>
          {free(add).length ? (
            <select className={inp} value={pick} onChange={(e) => { setPick(e.target.value); setErr(""); }}>
              <option value="">Выберите ученика…</option>{free(add).map((x: Student) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          ) : <p className="text-sm text-slate-500">Нет свободных учеников по предмету «{add.subject}». Добавьте ученика во вкладке «Ученики» или освободите его из другой группы.</p>}
          {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
          <div className="mt-4 flex justify-end gap-2"><button className={`${btn} hover:bg-slate-100`} onClick={() => setAdd(null)}>Отмена</button><button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={addStudent}>Добавить</button></div>
        </Modal>
      )}
      {create && (
        <Modal title="Новая группа" onClose={() => setCreate(false)}>
          <div className="space-y-3">
            <input className={inp} placeholder="Название, например MATH-2" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(""); }} />
            <select className={inp} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{SUBJECTS.map((x) => <option key={x}>{x}</option>)}</select>
            <input className={inp} type="number" placeholder="Вместимость" value={f.capacity} onChange={(e) => { setF({ ...f, capacity: e.target.value }); setErr(""); }} />
            <p className="text-xs text-slate-500">Преподаватель: {TEACHERS.find((t) => t.subject === f.subject)?.name}</p>
            {err && <p className="text-xs text-rose-600">{err}</p>}
          </div>
          <div className="mt-4 flex justify-end gap-2"><button className={`${btn} hover:bg-slate-100`} onClick={() => setCreate(false)}>Отмена</button><button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={createGroup}>Создать</button></div>
        </Modal>
      )}
    </>
  );
}

/* ───────── AI-сервисы ───────── */
function AiTab({ students, lessons, setLessons, groups, toast }: any) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");
  const [busy, setBusy] = useState(false);
  const [aerr, setAerr] = useState("");
  const [gid, setGid] = useState(String(groups[0]?.id ?? ""));
  const debtors: Student[] = students.filter((x: Student) => payStatus(x) !== "paid");
  const msg = (x: Student) => `Здравствуйте! Напоминаем об оплате за «${x.subject}» (${x.name}): ${x.amount.toLocaleString("ru-RU")} ₸, срок ${x.due}${payStatus(x) === "overdue" ? " — просрочено" : ""}. Спасибо! Daiyndal.kz`;

  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true); setAerr(""); setAns("");
    try {
      const context = {
        today: TODAY,
        students: students.map((x: Student) => ({ name: x.name, subject: x.subject, status: payStatus(x), due: x.due, amount: x.amount, group: groups.find((g: Group) => g.id === x.groupId)?.name ?? null })),
        groups: groups.map((g: Group) => ({ name: g.name, subject: g.subject, teacher: g.teacher, capacity: g.capacity, count: students.filter((x: Student) => x.groupId === g.id).length })),
        lessons,
      };
      const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, context }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка сервиса");
      setAns(d.answer);
    } catch (e: any) { setAerr(e.message || "Сервис недоступен"); } finally { setBusy(false); }
  };

  const slot = useMemo(() => {
    const g: Group | undefined = groups.find((x: Group) => x.id === +gid);
    if (!g) return null;
    for (const d of DAYS.slice(0, 6)) for (const t of SLOTS.filter((x) => x >= "15:00")) {
      if (lessons.some((l: Lesson) => l.day === d && l.time === t && l.teacher === g.teacher)) continue;
      const room = ROOMS.find((r) => !lessons.some((l: Lesson) => l.day === d && l.time === t && l.room === r));
      if (room) return { g, day: d, time: t, room };
    }
    return null;
  }, [gid, lessons, groups]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card c="p-5 lg:col-span-2">
        <h3 className="font-semibold">ИИ-ассистент администратора</h3>
        <p className="mb-3 text-xs text-slate-500">Спросите про должников, заполненность групп, свободные кабинеты — ассистент видит данные центра (без телефонов).</p>
        <div className="flex gap-2">
          <input className={inp} placeholder="Например: кому в первую очередь напомнить об оплате?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
          <button disabled={busy} onClick={ask} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}>{busy ? "…" : "Спросить"}</button>
        </div>
        {busy && <Sk c="mt-3 h-16 w-full" />}
        {aerr && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{aerr}</p>}
        {ans && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm">{ans}</p>}
      </Card>

      <Card c="p-5">
        <h3 className="font-semibold">Умный подбор слота для группы</h3>
        <p className="mb-3 text-xs text-slate-500">Ищет ближайшее время после 15:00, когда свободны и преподаватель, и кабинет.</p>
        <select className={inp} value={gid} onChange={(e) => setGid(e.target.value)}>{groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        {slot ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span>{slot.day} {slot.time} · {slot.room} · {slot.g.teacher}</span>
            <button className={`${btn} bg-emerald-600 text-white`} onClick={() => { setLessons((p: Lesson[]) => [...p, { id: Date.now(), teacher: slot.g.teacher, subject: slot.g.subject, room: slot.room, day: slot.day, time: slot.time, groupId: slot.g.id }]); toast("Урок добавлен в расписание"); }}>Назначить</button>
          </div>
        ) : <p className="mt-3 text-sm text-rose-600">Свободных слотов не найдено</p>}
      </Card>

      <Card c="p-5">
        <h3 className="font-semibold">Напоминания об оплате <span className="text-xs font-normal text-slate-400">(шаблоны)</span></h3>
        <div className="mt-3 space-y-2">
          {debtors.map((x) => (
            <div key={x.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span className="truncate">{x.name} · <span className={payStatus(x) === "overdue" ? "text-rose-600" : "text-amber-600"}>{PAY[payStatus(x)].label}</span></span>
              <button className={`${btn} border border-slate-200 hover:bg-slate-100`} onClick={() => navigator.clipboard.writeText(msg(x)).then(() => toast("Текст скопирован"), () => toast("Не удалось скопировать", "warn"))}>Копировать</button>
            </div>))}
          {!debtors.length && <p className="text-sm text-slate-400">Все оплатили 🎉</p>}
        </div>
      </Card>
    </div>
  );
}

/* ───────── Attendance ───────── */
function AttendanceTab({ students, groups, toast }: any) {
  const [date, setDate] = useState(TODAY);
  const [subject, setSubject] = useState("all");
  const [gid, setGid] = useState("all");
  const [marks, setMarks] = useState<Record<string, Mark>>(() => {
    const m: Record<string, Mark> = {}; // демо-история за последние 10 дней
    seedStudents.forEach((s) => { for (let i = 1; i <= 10; i++) m[`${s.id}|${addDays(TODAY, -i)}`] = (s.id + i) % 7 === 0 ? "absent" : (s.id * i) % 9 === 0 ? "excused" : "present"; });
    return m;
  });
  const list = students.filter((s: Student) => (subject === "all" || s.subject === subject) && (gid === "all" || String(s.groupId) === gid));
  const month = date.slice(0, 7);
  const pct = (id: number) => {
    const v = Object.entries(marks).filter(([k]) => k.startsWith(`${id}|${month}`)).map(([, m]) => m);
    return v.length ? Math.round((v.filter((m) => m === "present").length / v.length) * 100) : null;
  };
  const set = (id: number, m: Mark) => { setMarks((p) => ({ ...p, [`${id}|${date}`]: m })); toast("Отметка сохранена"); };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input type="date" className={inp + " sm:w-48"} value={date} onChange={(e) => setDate(e.target.value || TODAY)} />
        <select className={inp + " sm:w-48"} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="all">Все предметы</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={inp + " sm:w-48"} value={gid} onChange={(e) => setGid(e.target.value)}>
          <option value="all">Все группы</option>{groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <Card c="divide-y divide-slate-100">
        {list.map((s: Student) => { const cur = marks[`${s.id}|${date}`]; const p = pct(s.id); return (
          <div key={s.id} className="flex flex-col gap-2 p-4 transition hover:bg-slate-50/80 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-slate-900">{s.name}</p>
              <p className="text-xs text-slate-500">{s.subject} · за месяц: <b className={p !== null && p < 70 ? "text-rose-600" : "text-emerald-600"}>{p === null ? "—" : `${p}%`}</b></p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MARK) as Mark[]).map((m) => (
                <button key={m} onClick={() => set(s.id, m)} className={`${btn} ${cur === m ? MARK[m].cls : "border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>{MARK[m].label}</button>
              ))}
            </div>
          </div>); })}
      </Card>
    </>
  );
}

/* ───────── Shell: tabs, ⌘K, toasts, loading/error ───────── */
const TABS = [["overview", "Обзор"], ["students", "Ученики"], ["groups", "Группы"], ["schedule", "Расписание"], ["attendance", "Посещаемость"], ["ai", "ИИ-сервисы"]] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overview");
  const [students, setStudents] = useState(seedStudents);
  const [lessons, setLessons] = useState(seedLessons);
  const [groups, setGroups] = useState(seedGroups);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [cmd, setCmd] = useState(false);
  const [cq, setCq] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);

  const toast = useCallback((msg: string, kind = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  const load = useCallback(() => { setLoading(true); setError(false); setTimeout(() => setLoading(false), 700); /* TODO: fetch → catch → setError(true) */ }, []);
  useEffect(load, [load]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); setCq(""); } if (e.key === "Escape") setCmd(false); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const results = [
    ...TABS.map(([k, l]) => ({ label: `Перейти: ${l}`, run: () => { setTab(k); } })),
    ...students.map((s) => ({ label: `Ученик: ${s.name}`, run: () => { setTab("students"); setQ(s.name); } })),
  ].filter((r) => r.label.toLowerCase().includes(cq.toLowerCase())).slice(0, 7);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">Daiyndal <span className="text-indigo-600">Admin</span></h1>
          <button onClick={() => setCmd(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100">
            Поиск <kbd className="rounded bg-slate-100 px-1.5 text-xs">Ctrl K</kbd>
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${tab === k ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {error ? (
          <Card c="p-10 text-center"><p className="mb-3 text-slate-600">Не удалось загрузить данные</p><button className={`${btn} bg-indigo-600 text-white`} onClick={load}>Повторить</button></Card>
        ) : loading ? (
          <div className="space-y-3"><Sk c="h-10 w-full" />{[...Array(5)].map((_, i) => <Sk key={i} c="h-14 w-full" />)}</div>
        ) : tab === "overview" ? <OverviewTab {...{ students, lessons }} goStudents={() => setTab("students")} />
          : tab === "students" ? <StudentsTab {...{ students, setStudents, toast, q, setQ }} />
          : tab === "groups" ? <GroupsTab {...{ groups, setGroups, students, setStudents, lessons, toast }} />
          : tab === "schedule" ? <ScheduleTab {...{ lessons, setLessons, groups, toast }} />
          : tab === "attendance" ? <AttendanceTab {...{ students, groups, toast }} />
          : <AiTab {...{ students, lessons, setLessons, groups, toast }} />}
      </main>

      {cmd && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-24 backdrop-blur-sm" onClick={() => setCmd(false)}>
          <Card c="w-full max-w-lg overflow-hidden"><div onClick={(e) => e.stopPropagation()}>
            <input autoFocus className="w-full border-b border-slate-100 px-4 py-3 text-sm outline-none" placeholder="Раздел или ученик…" value={cq} onChange={(e) => setCq(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { results[0].run(); setCmd(false); } }} />
            {results.map((r) => <button key={r.label} className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-indigo-50" onClick={() => { r.run(); setCmd(false); }}>{r.label}</button>)}
          </div></Card>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => <div key={t.id} className={`rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${t.kind === "warn" ? "bg-amber-600" : "bg-slate-900"}`}>{t.msg}</div>)}
      </div>
    </div>
  );
}
