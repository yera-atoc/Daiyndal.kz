"use client";

import { useMemo, useState } from "react";
import type { StructuredLesson } from "@/lib/supabaseClient";
import {
  XP_LESSON_COMPLETION_BONUS,
  XP_PER_CORRECT_ANSWER,
} from "@/lib/gamification";

export type LessonResult = {
  correctCount: number;
  totalCount: number;
  xpEarned: number;
};

type Phase = "lecture" | "quiz" | "result";

export default function LessonPlayer({
  lesson,
  onFinish,
}: {
  lesson: StructuredLesson;
  onFinish: (result: LessonResult) => void;
}) {
  const tasks = useMemo(() => lesson.tasks ?? [], [lesson]);
  const total = tasks.length;

  const [phase, setPhase] = useState<Phase>("lecture");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);

  const task = tasks[step];
  const correctCount = Object.values(answers).filter(Boolean).length;

  function mark(isCorrect: boolean) {
    setAnswers((a) => ({ ...a, [step]: isCorrect }));
    if (isCorrect) {
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      setFlash("correct");
    } else {
      setStreak(0);
      setFlash("wrong");
    }
    setTimeout(() => setFlash(null), 500);
  }

  function chooseOption(option: string) {
    if (selected) return;
    setSelected(option);
    setShowAnswer(true);
    mark(option.trim() === task.answer.trim());
  }

  function selfGrade(isCorrect: boolean) {
    if (showAnswer && answers[step] !== undefined) return;
    setShowAnswer(true);
    mark(isCorrect);
  }

  function goNext() {
    if (step + 1 < total) {
      setStep((s) => s + 1);
      setSelected(null);
      setShowAnswer(false);
    } else {
      const bonus = total > 0 && correctCount === total ? XP_LESSON_COMPLETION_BONUS : 0;
      onFinish({
        correctCount,
        totalCount: total,
        xpEarned: correctCount * XP_PER_CORRECT_ANSWER + bonus,
      });
      setPhase("result");
    }
  }

  function restart() {
    setPhase("lecture");
    setStep(0);
    setAnswers({});
    setSelected(null);
    setShowAnswer(false);
    setStreak(0);
    setBestStreak(0);
  }

  if (phase === "lecture") {
    return (
      <div className="space-y-6">
        <p className="text-[13px] text-ink-soft">{lesson.summary}</p>

        <div className="space-y-4">
          {lesson.sections?.map((s, i) => (
            <div key={i}>
              <h4 className="text-[14px] font-semibold text-ink">{s.heading}</h4>
              <p className="mt-1 whitespace-pre-line text-[13px] text-ink-soft">
                {s.content}
              </p>
            </div>
          ))}
        </div>

        {total > 0 ? (
          <button
            onClick={() => setPhase("quiz")}
            className="w-full rounded-xl bg-accent py-3 text-[13px] font-semibold text-white transition hover:bg-accent-hover"
          >
            🎮 Тапсырмаларды бастау · {total} сұрақ · +{XP_PER_CORRECT_ANSWER} XP әр дұрысы үшін
          </button>
        ) : (
          <p className="rounded-xl bg-paper-tint px-4 py-3 text-[12px] text-ink-faint">
            Бұл сабақта тапсырма жоқ.
          </p>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const stars = percent >= 90 ? 3 : percent >= 60 ? 2 : percent > 0 ? 1 : 0;
    const bonus = total > 0 && correctCount === total ? XP_LESSON_COMPLETION_BONUS : 0;
    const xpEarned = correctCount * XP_PER_CORRECT_ANSWER + bonus;

    return (
      <div className="space-y-5 text-center">
        <div className="text-4xl">
          {"⭐".repeat(stars)}
          {"☆".repeat(3 - stars)}
        </div>
        <div>
          <p className="font-display text-3xl font-semibold text-ink">
            {correctCount}/{total}
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">дұрыс жауап · {percent}%</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white">
          +{xpEarned} XP {bonus > 0 && "🏆"}
        </div>
        {bestStreak >= 2 && (
          <p className="text-[12px] text-ink-faint">
            Ең үздік серия: {bestStreak} қатарынан дұрыс 🔥
          </p>
        )}
        <button
          onClick={restart}
          className="rounded-full border border-line px-5 py-2 text-[13px] font-medium text-ink hover:bg-paper-tint"
        >
          Қайталап көру
        </button>
      </div>
    );
  }

  // phase === "quiz"
  const alreadyAnswered = answers[step] !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-1.5 w-full rounded-full bg-paper-tint">
            <div
              className="h-1.5 rounded-full bg-accent transition-all"
              style={{ width: `${((step + (showAnswer ? 1 : 0)) / total) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-ink-faint">
            Сұрақ {step + 1} / {total}
          </p>
        </div>
        {streak >= 2 && (
          <span className="ml-3 shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-[12px] font-semibold text-orange-600">
            🔥 {streak} қатарынан
          </span>
        )}
      </div>

      <div
        className={`rounded-xl border p-4 transition-colors ${
          flash === "correct"
            ? "border-green-300 bg-green-50"
            : flash === "wrong"
            ? "border-red-300 bg-red-50"
            : "border-line bg-white"
        }`}
      >
        {task.image_url && (
          <img
            src={task.image_url}
            alt={`Тапсырма ${step + 1} суреті`}
            className="mb-3 max-h-64 w-auto rounded-lg border border-line object-contain"
          />
        )}
        <p className="text-[13px] font-medium text-ink">{task.question}</p>

        {task.type === "choice" && task.options ? (
          <div className="mt-3 space-y-2">
            {task.options.map((o, oi) => {
              const isSelected = selected === o;
              const isCorrectOption = o.trim() === task.answer.trim();
              const showState = showAnswer && (isSelected || isCorrectOption);
              return (
                <button
                  key={oi}
                  onClick={() => chooseOption(o)}
                  disabled={!!selected}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-[13px] transition ${
                    showState
                      ? isCorrectOption
                        ? "border-green-400 bg-green-50 text-green-800"
                        : "border-red-300 bg-red-50 text-red-700"
                      : "border-line hover:bg-paper-tint"
                  } ${!selected ? "cursor-pointer" : "cursor-default"}`}
                >
                  {String.fromCharCode(65 + oi)}) {o}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Жауапты көрсету
              </button>
            ) : (
              <>
                <p className="rounded-lg bg-paper-tint px-3 py-2 text-[13px] text-ink-soft">
                  {task.answer}
                </p>
                {!alreadyAnswered && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => selfGrade(true)}
                      className="flex-1 rounded-lg border border-green-300 bg-green-50 py-1.5 text-[12px] font-medium text-green-700 hover:bg-green-100"
                    >
                      ✅ Дұрыс тапқанмын
                    </button>
                    <button
                      onClick={() => selfGrade(false)}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100"
                    >
                      ❌ Қателестім
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showAnswer && (
        <button
          onClick={goNext}
          className="w-full rounded-xl bg-ink py-2.5 text-[13px] font-semibold text-white hover:bg-ink/90"
        >
          {step + 1 < total ? "Келесі сұрақ →" : "Аяқтау 🏁"}
        </button>
      )}
    </div>
  );
}
