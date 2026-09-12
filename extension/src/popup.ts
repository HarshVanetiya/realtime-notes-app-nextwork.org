import { supabase } from './supabase';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loading = $('loading');
const signinForm = $<HTMLFormElement>('signin');
const signedIn = $('signedin');
const email = $<HTMLInputElement>('email');
const password = $<HTMLInputElement>('password');
const signinBtn = $<HTMLButtonElement>('signin-btn');
const signinStatus = $('signin-status');
const who = $('who');
const saveBtn = $<HTMLButtonElement>('save-btn');
const signoutBtn = $<HTMLButtonElement>('signout-btn');
const signedinStatus = $('signedin-status');

function setStatus(el: HTMLElement, text: string, tone: 'ok' | 'error' | '' = '') {
    el.textContent = text;
    el.dataset.tone = tone;
}

function show(state: 'loading' | 'signin' | 'signedin') {
    loading.hidden = state !== 'loading';
    signinForm.hidden = state !== 'signin';
    signedIn.hidden = state !== 'signedin';
}

async function notifyBackground() {
    await chrome.runtime.sendMessage({ type: 'auth-changed' }).catch(() => {});
}

async function render() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        who.textContent = data.session.user.email ?? data.session.user.id;
        show('signedin');
    } else {
        show('signin');
        email.focus();
    }
}

signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signinBtn.disabled = true;
    setStatus(signinStatus, 'Signing in…');
    const { error } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
    });
    signinBtn.disabled = false;
    if (error) {
        setStatus(signinStatus, error.message, 'error');
        return;
    }
    password.value = '';
    setStatus(signinStatus, '');
    await notifyBackground();
    await render();
});

saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    setStatus(signedinStatus, 'Saving…');
    const res = (await chrome.runtime
        .sendMessage({ type: 'save-current-tab' })
        .catch(() => null)) as { ok: boolean } | null;
    saveBtn.disabled = false;
    setStatus(signedinStatus, res?.ok ? 'Done — check the badge on the icon.' : 'Could not reach the extension.', res?.ok ? 'ok' : 'error');
});

signoutBtn.addEventListener('click', async () => {
    signoutBtn.disabled = true;
    await supabase.auth.signOut();
    signoutBtn.disabled = false;
    await notifyBackground();
    await render();
});

void render();
