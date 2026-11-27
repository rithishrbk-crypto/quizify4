api('/api/auth/me', { noRedirect: true }).then(() => location.replace('/dashboard')).catch(() => {});
(function () {
  const form = $('#form');
  const isRegister = Boolean($('#confirmPassword'));
  const formError = $('#formError');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(name, msg) {
    const input = form.elements[name];
    if (!input) return;
    const field = input.closest('.field');
    field.classList.toggle('invalid', Boolean(msg));
    field.querySelector('.err').textContent = msg || '';
  }
  function validate() {
    const v = (n) => form.elements[n].value;
    const errs = {};
    if (isRegister) {
      if (v('name').trim().length < 2) errs.name = 'Enter your full name.';
      if (!EMAIL_RE.test(v('email').trim())) errs.email = 'Enter a valid email address.';
      const p = v('password');
      if (p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) errs.password = 'Use at least 8 characters with a letter and a number.';
      if (!v('confirmPassword')) errs.confirmPassword = 'Confirm your password.';
      else if (v('confirmPassword') !== p) errs.confirmPassword = 'Passwords do not match.';
    } else {
      if (!EMAIL_RE.test(v('email').trim())) errs.email = 'Enter a valid email address.';
      if (!v('password')) errs.password = 'Enter your password.';
    }
    return errs;
  }
  function showErrors(errs) {
    for (const el of form.elements) if (el.name) setError(el.name, errs[el.name]);
  }

  form.addEventListener('input', (e) => { if (e.target.name) setError(e.target.name, ''); formError.classList.remove('show'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.classList.remove('show');
    const errs = validate();
    showErrors(errs);
    if (Object.keys(errs).length) { form.querySelector('.invalid input').focus(); return; }
    const btn = form.querySelector('button[type=submit]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = isRegister ? 'Creating account...' : 'Logging in...';
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await api(isRegister ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body, noRedirect: true });
      location.href = '/dashboard';
    } catch (err) {
      if (err.data && err.data.errors) showErrors(err.data.errors);
      formError.textContent = err.message;
      formError.classList.add('show');
      btn.disabled = false;
      btn.textContent = label;
    }
  });
})();
