/**
 * Sincroniza tema localStorage → cookie para o SSR.
 * Não altera classes no <html> antes da hidratação (evita React #418).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="app_color_theme";var t=localStorage.getItem(k);if(t==="dark"||t==="light"){document.cookie=k+"="+t+";path=/;max-age=31536000;SameSite=Lax";}}catch(e){}})();`;
