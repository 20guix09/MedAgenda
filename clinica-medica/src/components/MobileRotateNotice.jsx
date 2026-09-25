// componente visual desta parte do sistema

import { RotateCw, X } from 'lucide-react';
import { useState } from 'react';

// Sugestão discreta para aproveitar melhor telas pequenas em modo paisagem.
export default function MobileRotateNotice() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <aside className="mobile-rotate-notice" aria-live="polite">
      <RotateCw size={18} />
      <span>Para uma visão mais ampla, você pode virar o celular na horizontal.</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fechar aviso"><X size={16} /></button>
    </aside>
  );
}
