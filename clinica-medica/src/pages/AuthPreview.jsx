// página principal desta área do sistema

import { Eye, EyeOff, HeartPulse, Lock, Mail, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../styles/auth-preview.css';

// componente auth preview
export default function AuthPreview() {
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { cadastro, login, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = mode === 'register';

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => window.clearTimeout(loadingTimer);
  }, []);

  const panelCopy = useMemo(
    () =>
      isRegister
        ? {
            eyebrow: 'Bem-vindo',
            title: 'Sua agenda clínica ganha ritmo.',
            description:
              'Organize pacientes, profissionais e consultas com uma experiência leve, segura e preparada para crescer.',
            action: 'Já possui uma conta? Entrar',
          }
        : {
            eyebrow: 'MedAgenda',
            title: 'Entre com calma. O dia já está organizado.',
            description:
              'Acesse uma plataforma médica feita para atendimento ágil, informações claras e gestão humanizada.',
            action: 'Não possui uma conta? Criar conta',
          },
    [isRegister],
  );

// função para handle auth submit
  async function handleAuthSubmit(values) {
    setAuthError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (values.senha !== values.confirmarSenha) {
          throw new Error('As senhas precisam ser iguais.');
        }

        await cadastro(values);
        await login({
          email: values.email,
          nome: values.nome,
          senha: values.senha,
        });
        // Uma conta recém-criada recebe o tutorial no primeiro acesso.
        window.sessionStorage.setItem('medagenda:novoUsuario', 'true');
      } else {
        await login(values);
      }

      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (error) {
      setAuthError(error.message ?? 'Não foi possível acessar sua conta agora.');
    } finally {
      setIsSubmitting(false);
    }
  }

// função para handle google credential
  async function handleGoogleCredential(credential) {
    setAuthError('');
    setIsSubmitting(true);

    try {
      const session = await loginGoogle(credential);
      // Guardamos a informação para o onboarding que será criado na próxima etapa.
      if (session.novoUsuario) {
        window.sessionStorage.setItem('medagenda:novoUsuario', 'true');
      }
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (error) {
      setAuthError(error.message ?? 'Não foi possível entrar com o Google.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-preview auth-background">
      <LoadingIntro isVisible={isLoading} />
      <section className={`auth-shell ${isRegister ? 'is-register' : ''}`} aria-label="Acesso ao sistema">
        <div className="auth-form-panel auth-form-panel-login">
          <AuthBrand />
          <AuthForm
            error={authError}
            isSubmitting={isSubmitting}
            onSubmit={handleAuthSubmit}
            onGoogleCredential={handleGoogleCredential}
            showGoogle={!isRegister}
            title="Bem-vindo de volta"
            subtitle="Acesse seu painel médico"
            submitLabel="Entrar"
            fields={[
              { icon: Mail, label: 'E-mail', name: 'email', type: 'email', placeholder: 'seuemail@medagenda.com' },
              {
                icon: Lock,
                label: 'Senha',
                name: 'senha',
                type: showPassword ? 'text' : 'password',
                placeholder: 'Digite sua senha',
                trailing: (
                  <PasswordToggle
                    isVisible={showPassword}
                    onToggle={() => setShowPassword((current) => !current)}
                  />
                ),
              },
            ]}
          />
          <button className="auth-mobile-switch" type="button" onClick={() => setMode('register')}>
            Não possui uma conta? Criar conta
          </button>
        </div>

        <div className="auth-form-panel auth-form-panel-register">
          <AuthBrand />
          <AuthForm
            error={authError}
            isSubmitting={isSubmitting}
            onSubmit={handleAuthSubmit}
            onGoogleCredential={handleGoogleCredential}
            showGoogle={isRegister}
            title="Criar sua conta"
            subtitle="Comece a utilizar a plataforma"
            submitLabel="Criar conta"
            fields={[
              { icon: UserRound, label: 'Nome', name: 'nome', type: 'text', placeholder: 'Seu nome completo' },
              { icon: Mail, label: 'E-mail', name: 'email', type: 'email', placeholder: 'seuemail@medagenda.com' },
              {
                icon: Lock,
                label: 'Senha',
                name: 'senha',
                type: showPassword ? 'text' : 'password',
                placeholder: 'Crie uma senha',
                trailing: (
                  <PasswordToggle
                    isVisible={showPassword}
                    onToggle={() => setShowPassword((current) => !current)}
                  />
                ),
              },
              {
                icon: Lock,
                label: 'Confirmar senha',
                name: 'confirmarSenha',
                type: showConfirmPassword ? 'text' : 'password',
                placeholder: 'Confirme sua senha',
                trailing: (
                  <PasswordToggle
                    isVisible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((current) => !current)}
                  />
                ),
              },
            ]}
          />
          <button className="auth-mobile-switch" type="button" onClick={() => setMode('login')}>
            Já possui uma conta? Entrar
          </button>
        </div>

        <aside className="auth-overlay animate-panel-slide" aria-live="polite">
          <div className="auth-overlay-grid" aria-hidden="true" />
          <div className="auth-overlay-content">
            <div className="auth-logo-mark">
              <HeartPulse size={31} strokeWidth={1.75} />
            </div>
            <p>{panelCopy.eyebrow}</p>
            <h1>{panelCopy.title}</h1>
            <span>{panelCopy.description}</span>
            <button className="auth-overlay-action interactive-press" type="button" onClick={() => setMode(isRegister ? 'login' : 'register')}>
              {panelCopy.action}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

// componente loading intro
function LoadingIntro({ isVisible }) {
  return (
    <div className={`loading-intro ${isVisible ? 'is-visible' : 'is-hidden'}`} role="status" aria-live="polite" aria-hidden={!isVisible}>
      <div className="loading-card">
        <div className="loading-logo">
          <HeartPulse size={34} strokeWidth={1.75} />
        </div>
        <strong className="loading-brand" aria-label="MedAgenda">
          <span>Med</span>Agenda
        </strong>
        <p>Preparando sua rotina clínica</p>
        <div className="loading-track" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}

// componente auth brand
function AuthBrand() {
  return (
    <div className="auth-brand" aria-label="MedAgenda">
      <div className="auth-brand-mark">
        <HeartPulse size={22} strokeWidth={1.8} />
      </div>
      <div>
        <strong>
          <span className="brand-med">Med</span>
          <span className="brand-agenda">Agenda</span>
        </strong>
        <span>Gestão clínica integrada</span>
      </div>
    </div>
  );
}

// componente auth form
function AuthForm({ error, fields, isSubmitting, onGoogleCredential, onSubmit, showGoogle, submitLabel, subtitle, title }) {
// função para handle submit
  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    onSubmit(Object.fromEntries(formData.entries()));
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-heading">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="auth-fields">
        {fields.map((field) => {
          const Icon = field.icon;

          return (
            <label className="auth-field" key={field.label}>
              <span>{field.label}</span>
              <div className="auth-input-wrap soft-surface-inset">
                <Icon size={18} strokeWidth={1.65} aria-hidden="true" />
                <input
                  minLength={field.name === 'senha' ? 6 : undefined}
                  name={field.name}
                  placeholder={field.placeholder}
                  required
                  type={field.type}
                />
                {field.trailing}
              </div>
            </label>
          );
        })}
      </div>

      {error ? <p className="auth-form-error">{error}</p> : null}

      <button className="auth-submit interactive-press" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Carregando...' : submitLabel}
      </button>

      {showGoogle ? <><div className="auth-divider"><span>ou</span></div>
        <GoogleSignInButton disabled={isSubmitting} onCredential={onGoogleCredential} /></> : null}
    </form>
  );
}

// componente google sign in button
function GoogleSignInButton({ disabled, onCredential }) {
  const buttonRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || disabled) return undefined;

    let cancelled = false;

// função para render google button
    function renderGoogleButton() {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) onCredential(response.credential);
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 330,
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => { cancelled = true; };
    }

    const existing = document.querySelector('script[data-medagenda-google]');
    if (existing) {
      existing.addEventListener('load', renderGoogleButton, { once: true });
      return () => {
        cancelled = true;
        existing.removeEventListener('load', renderGoogleButton);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.medagendaGoogle = 'true';
    script.addEventListener('load', renderGoogleButton, { once: true });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener('load', renderGoogleButton);
    };
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return <p className="google-auth-config-error">Configure VITE_GOOGLE_CLIENT_ID para ativar o Google.</p>;
  }

  return <div className={`google-signin-wrap ${disabled ? 'is-disabled' : ''}`} ref={buttonRef} />;
}

// componente password toggle
function PasswordToggle({ isVisible, onToggle }) {
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <button className="password-toggle" type="button" onClick={onToggle} aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}>
      <Icon size={18} strokeWidth={1.65} />
    </button>
  );
}
