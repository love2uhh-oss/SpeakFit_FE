(() => {
  
  const API_BASE = 'https://api.sayupai.co.kr';
  
  const USER_STORAGE_KEY = 'manus-runtime-user-info';
  
  const CONTROL_ID = 'sayupai-global-nav-controls';
  
  const STYLE_ID = 'sayupai-global-nav-style';
  

  
  function getStoredUser() {
    
    try {
      
      const raw = window.localStorage.getItem(USER_STORAGE_KEY);
      
      if (!raw || raw === 'null' || raw === 'undefined') return null;
      
      return JSON.parse(raw);
      
    } catch {
      
      return null;
      
    }
    
  }
  

  
  function isPublicAuthPath(pathname) {
    
    return pathname === '/' || pathname === '/login' || pathname === '/terms' || pathname === '/privacy' || pathname === '/pitch' || pathname === '/pricing' || pathname.startsWith('/share/');
    
  }
  

  
  function goTo(path) {
    
    window.location.assign(path);
    
  }
  

  
  function resolveHomePath() {
    
    return getStoredUser() || !isPublicAuthPath(window.location.pathname) ? '/start' : '/';
    
  }
  

  
  async function logout() {
    
    const confirmed = window.confirm('로그아웃하시겠습니까?');
    
    if (!confirmed) return;
    
    try {
      
      await fetch(`${API_BASE}/api/trpc/auth.logout?batch=1`, {
        
        method: 'POST',
        
        credentials: 'include',
        
        headers: { 'content-type': 'application/json' },
        
        body: JSON.stringify({ 0: { json: null } }),
        
      });
      
    } catch (error) {
      
      console.warn('[SayUpAI] logout request failed; clearing local session cache.', error);
      
    } finally {
      
      try {
        
        window.localStorage.removeItem(USER_STORAGE_KEY);
        
      } catch {}
      
      window.location.assign('/login');
      
    }
    
  }
  

  
  function ensureStyle() {
    
    if (document.getElementById(STYLE_ID)) return;
    
    const style = document.createElement('style');
    
    style.id = STYLE_ID;
    
    style.textContent = `
    
      #${CONTROL_ID} {
      
        position: fixed;
        
        top: max(14px, env(safe-area-inset-top));
        
        right: max(14px, env(safe-area-inset-right));
        
        z-index: 2147483000;
        
        display: flex;
        
        align-items: center;
        
        gap: 8px;
        
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        
      }
      
      #${CONTROL_ID} .sayupai-global-nav__button {
      
        appearance: none;
        
        border: 1px solid rgba(148, 163, 184, 0.34);
        
        background: rgba(7, 17, 31, 0.88);
        
        color: #f8fafc;
        
        min-height: 38px;
        
        padding: 0 13px;
        
        border-radius: 999px;
        
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.30);
        
        backdrop-filter: blur(14px);
        
        -webkit-backdrop-filter: blur(14px);
        
        cursor: pointer;
        
        font-size: 13px;
        
   











































































