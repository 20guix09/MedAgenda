// componente visual desta parte do sistema

import { Activity, CalendarClock, ChevronLeft, ChevronRight, Stethoscope, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import '../styles/onboarding.css';

// Passos curtos para ensinar o fluxo obrigatório do MedAgenda.
const steps = [
  {
    icon: null,
    eyebrow: 'Bem-vindo ao MedAgenda',
    title: 'Sua clínica organizada desde o primeiro acesso.',
    text: 'Em menos de um minuto você entende a ordem certa para preparar a agenda e começar a registrar consultas.',
  },
  {
    icon: Activity,
    eyebrow: 'Passo 1',
    title: 'Cadastre uma especialidade',
    text: 'Comece pelas áreas atendidas pela clínica. Uma especialidade ativa é necessária para vincular um médico.',
  },
  {
    icon: Stethoscope,
    eyebrow: 'Passo 2',
    title: 'Cadastre o médico',
    text: 'Depois da especialidade, cadastre o profissional e selecione uma ou mais especialidades ativas para ele.',
  },
  {
    icon: UserRound,
    eyebrow: 'Passo 3',
    title: 'Cadastre o paciente',
    text: 'A consulta também precisa de um paciente. Você pode cadastrar pacientes a qualquer momento antes do agendamento.',
  },
  {
    icon: CalendarClock,
    eyebrow: 'Passo 4',
    title: 'Agora crie a consulta',
    text: 'Com paciente, médico e especialidade cadastrados, faça o agendamento. Toda nova consulta começa automaticamente como pendente.',
  },
];

// componente onboarding tutorial
export default function OnboardingTutorial({ open, onClose }) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

// função para finish
  function finish() {
    setStep(0);
    onClose();
  }

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section className="onboarding-card" role="dialog" aria-modal="true" aria-label="Tutorial do MedAgenda">
        <button className="onboarding-close" type="button" onClick={finish} aria-label="Pular tutorial">
          <X size={20} />
        </button>

        <div className="onboarding-visual" aria-hidden="true">
          {Icon ? (
            <div className="onboarding-step-icon"><Icon size={34} strokeWidth={1.65} /></div>
          ) : (
            <div className="onboarding-logo"><img src="/logo-medAgenda.png" alt="" /></div>
          )}
          <span className="onboarding-orbit" />
        </div>

        <div className="onboarding-copy">
          <p>{current.eyebrow}</p>
          <h2>{current.title}</h2>
          <span>{current.text}</span>
        </div>

        <div className="onboarding-progress" aria-label={`Passo ${step + 1} de ${steps.length}`}>
          {steps.map((item, index) => <span className={index === step ? 'is-active' : ''} key={item.title} />)}
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-skip" type="button" onClick={finish}>Pular tutorial</button>
          <div>
            {step > 0 ? (
              <button className="onboarding-back" type="button" onClick={() => setStep((value) => value - 1)}>
                <ChevronLeft size={17} /> Voltar
              </button>
            ) : null}
            <button className="onboarding-next" type="button" onClick={() => (isLast ? finish() : setStep((value) => value + 1))}>
              {isLast ? 'Começar a usar' : 'Próximo'} {isLast ? null : <ChevronRight size={17} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
