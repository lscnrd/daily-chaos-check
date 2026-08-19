import { useState } from "react";
import { Footprints, Droplet, Beef, Target, Bell, ChevronRight, ChevronLeft, X } from "lucide-react";

const STEPS = [
  {
    icon: Footprints,
    title: "Welkom bij Health Trail",
    body: "Elke dag zie je bovenaan een parcours met vier checkpoints: bewegen, water, eten en rust. Hoe meer je afvinkt, hoe verder het pad kleurt.",
  },
  {
    icon: Droplet,
    title: "Snel loggen",
    body: "Water loggen kan met één tik op het plusje. Voor beweging kies je een activiteit en een tijdsblok (15/30/45/60 min) — geen typen nodig.",
  },
  {
    icon: Beef,
    title: "Elke dag een ander recept",
    body: "Het voedingsschema roteert automatisch per dag. Klap een recept open voor ingrediënten en bereiding, en vink het af zodra je het hebt gegeten.",
  },
  {
    icon: Target,
    title: "Jouw doel, jouw cijfers",
    body: "Vul je profiel in bij Preferences (gewicht, lengte, doel) — dan berekent de app een dagelijks caloriedoel en kun je portiegroottes daarop laten aanpassen.",
  },
  {
    icon: Bell,
    title: "Klaar om te beginnen",
    body: "Zet eventueel herinneringen aan bij Preferences, en gebruik de balk onderaan voor je meest gelogde acties. Veel succes!",
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(21, 36, 31, 0.55)" }}
    >
      <div className="w-full max-w-sm rounded-2xl p-6 relative" style={{ background: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
        <button
          aria-label="Overslaan"
          onClick={onComplete}
          className="absolute top-4 right-4 p-1 focus-visible:outline focus-visible:outline-2"
          style={{ color: "#4A5D57" }}
        >
          <X size={18} />
        </button>

        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: "#EAF2F0" }}
        >
          <Icon size={22} color="#2F6E63" />
        </div>

        <h2 className="text-lg font-semibold mb-2" style={{ color: "#15241F" }}>{current.title}</h2>
        <p className="text-sm mb-6" style={{ color: "#4A5D57" }}>{current.body}</p>

        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                background: i === step ? "#2F6E63" : "#D3E0DB",
                transition: "width 0.2s ease",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="p-2.5 rounded-lg flex items-center justify-center focus-visible:outline focus-visible:outline-2"
              style={{ border: "1px solid #D3E0DB" }}
              aria-label="Vorige"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <button
            onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 focus-visible:outline focus-visible:outline-2"
            style={{ background: "#2F6E63", color: "#FFFFFF" }}
          >
            {isLast ? "Aan de slag" : "Volgende"}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>

        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full text-center text-xs mt-3"
            style={{ color: "#4A5D57" }}
          >
            Overslaan
          </button>
        )}
      </div>
    </div>
  );
}
