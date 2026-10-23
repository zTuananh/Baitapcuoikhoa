/**
 * button.js - Xử lý điều khiển Mega Menu và Modal Đăng nhập / Đăng ký
 */
document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. XỬ LÝ BẬT/TẮT MEGA MENU
     ========================================================================== */
  const megaBtn = document.getElementById('mega-menu-btn');
  const megaOverlay = document.getElementById('mega-menu-overlay');

  if (megaBtn && megaOverlay) {
    const toggleMegaMenu = (shouldOpen) => {
      const isOpen = shouldOpen !== undefined 
        ? shouldOpen 
        : !megaOverlay.classList.contains('active');

      megaBtn.classList.toggle('active', isOpen);
      megaOverlay.classList.toggle('active', isOpen);
      megaBtn.setAttribute('aria-expanded', isOpen);
    };

    // Click nút 9 chấm
    megaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMegaMenu();
    });

    // Bấm ra ngoài vùng menu để đóng
    document.addEventListener('click', (e) => {
      if (!megaOverlay.contains(e.target) && !megaBtn.contains(e.target)) {
        toggleMegaMenu(false);
      }
    });

    // Đóng khi bấm vào link trong Mega Menu
    megaOverlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => toggleMegaMenu(false));
    });
  }

  /* ==========================================================================
     2. XỬ LÝ POPUP MODAL ĐĂNG NHẬP / ĐĂNG KÝ
     ========================================================================== */
  const authModal = document.getElementById('auth-modal');
  const openLoginBtn = document.getElementById('open-login-btn');
  const openRegisterBtn = document.getElementById('open-register-btn');
  const closeAuthBtn = document.getElementById('close-auth-modal');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');

  // Hàm Mở Modal Auth (chọn sẵn tab login hoặc register)
  const openAuthModal = (targetTab = 'login') => {
    if (!authModal) return;
    authModal.classList.add('active');
    authModal.setAttribute('aria-hidden', 'false');
    switchAuthTab(targetTab);
  };

  // Hàm Đóng Modal Auth
  const closeAuthModal = () => {
    if (!authModal) return;
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
  };

  // Hàm Chuyển đổi Tab (Đăng nhập <-> Đăng ký)
  const switchAuthTab = (tabName) => {
    authTabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    authForms.forEach(form => {
      if (form.id === `form-${tabName}`) {
        form.classList.add('active');
      } else {
        form.classList.remove('active');
      }
    });
  };

  // Nút mở Đăng nhập từ Header
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => openAuthModal('login'));
  }

  // Nút mở Đăng ký từ Header
  if (openRegisterBtn) {
    openRegisterBtn.addEventListener('click', () => openAuthModal('register'));
  }

  // Nút Đóng Modal
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', closeAuthModal);
  }

  // Click ra ngoài background đen mờ để đóng Modal
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        closeAuthModal();
      }
    });
  }

  // Chuyển Tab khi bấm vào Tab Đăng nhập / Đăng ký
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchAuthTab(tab.dataset.tab);
    });
  });

  // Bấm nút Esc đóng Modal hoặc Mega Menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (authModal && authModal.classList.contains('active')) {
        closeAuthModal();
      }
      if (megaOverlay && megaOverlay.classList.contains('active')) {
        megaBtn.classList.remove('active');
        megaOverlay.classList.remove('active');
      }
    }
  });

  /* ==========================================================================
     3. TÍCH HỢP XỬ LÝ SỰ KIỆN SUBMIT FORM & MẠNG XÃ HỘI
     ========================================================================== */
  const btnGoogle = document.getElementById('btn-google-login');
  const btnFacebook = document.getElementById('btn-facebook-login');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      alert('Đang kết nối tới tài khoản Google của bạn...');
      // Code gọi Google OAuth API sẽ đặt tại đây
    });
  }

  if (btnFacebook) {
    btnFacebook.addEventListener('click', () => {
      alert('Đang kết nối tới tài khoản Facebook của bạn...');
      // Code gọi Facebook SDK/OAuth API sẽ đặt tại đây
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      alert(`Đăng nhập thành công với email: ${email}`);
      closeAuthModal();
    });
  }

  if (formRegister) {
    formRegister.addEventListener('submit', (e) => {
      e.preventDefault();
      const pass = document.getElementById('reg-password').value;
      const confirmPass = document.getElementById('reg-confirm-password').value;

      if (pass !== confirmPass) {
        alert('Mật khẩu xác nhận không trùng khớp!');
        return;
      }

      alert('Tạo tài khoản thành công! Vui lòng kiểm tra email để xác minh.');
      closeAuthModal();
    });
  }

});