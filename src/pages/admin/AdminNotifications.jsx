/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Admin → Notifications. Configure where each kind of email goes, turn email/SMS
 * on or off, set the SMS provider + credentials, and send test messages to prove
 * the setup works — all without touching the server.
 */
import React, { useEffect, useState } from 'react';
import { Mail, MessageSquare, Send, Save, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { notificationSettingsApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const EMAIL_FIELDS = [
  { key: 'careersEmail', label: 'Careers / Job applications', hint: 'Job applications & CV submissions' },
  { key: 'ordersEmail',  label: 'New orders',                hint: 'New shop orders (COD & online)' },
  { key: 'quotesEmail',  label: 'Quotes & RFQ',              hint: 'Quote/RFQ requests & accept-reject decisions' },
  { key: 'contactEmail', label: 'Contact form',              hint: 'Website "Contact us" enquiries' },
  { key: 'supportEmail', label: 'Support / Leads (catch-all)', hint: 'Catalogue leads & general fallback' },
  { key: 'fromEmail',    label: 'From address',              hint: 'The "From:" shown to recipients' },
];

const Field = ({ label, hint, value, onChange, type = 'email', placeholder }) => (
  <label className="block">
    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</span>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
    {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
  </label>
);

const Toggle = ({ label, checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
      checked ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
    <span className={`w-8 h-5 rounded-full relative transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-3.5' : 'left-0.5'}`} />
    </span>
    {label}: {checked ? 'On' : 'Off'}
  </button>
);

const TestRow = ({ icon: Icon, label, onTest }) => {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const run = async () => {
    if (!to.trim()) return;
    setBusy(true);
    try {
      const { data } = await onTest(to.trim());
      toast({ title: 'Sent', description: data?.message || 'Test sent.' });
    } catch (e) {
      toast({ title: 'Failed', description: e.response?.data?.message || 'Could not send.', variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 min-w-[140px]">
        <Icon className="h-4 w-4 text-blue-600" />{label}
      </div>
      <input value={to} onChange={e => setTo(e.target.value)} placeholder={label.includes('SMS') ? '+91…' : 'you@example.com'}
        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
      <button onClick={run} disabled={busy || !to.trim()}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test
      </button>
    </div>
  );
};

const AdminNotifications = () => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    notificationSettingsApi.get()
      .then(({ data }) => setForm(data))
      .catch(() => toast({ title: 'Failed to load settings', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      // Send credentials only if the admin typed new ones (masked fields stay blank).
      const payload = {
        careersEmail: form.careersEmail, ordersEmail: form.ordersEmail, quotesEmail: form.quotesEmail,
        contactEmail: form.contactEmail, supportEmail: form.supportEmail, fromEmail: form.fromEmail,
        emailEnabled: form.emailEnabled, smsEnabled: form.smsEnabled,
        smsProvider: form.smsProvider, smsSenderId: form.smsSenderId,
        msg91TemplateId: form.msg91TemplateId, twilioFromNumber: form.twilioFromNumber,
        // Per-event MSG91 Flow template ids
        tplWelcome: form.tplWelcome, tplOrderCod: form.tplOrderCod, tplOrderOnline: form.tplOrderOnline,
        tplOrderShipped: form.tplOrderShipped, tplOrderDelivered: form.tplOrderDelivered,
        tplOrderCancelled: form.tplOrderCancelled, tplOrderProcessing: form.tplOrderProcessing,
        tplOrderRefunded: form.tplOrderRefunded, tplPasswordChanged: form.tplPasswordChanged,
        tplRfqReceived: form.tplRfqReceived, tplRfqReady: form.tplRfqReady,
        msg91AuthKey: form.msg91AuthKeyNew || '',
        twilioAccountSid: form.twilioAccountSidNew || '',
        twilioAuthToken: form.twilioAuthTokenNew || '',
      };
      const { data } = await notificationSettingsApi.save(payload);
      toast({ title: 'Saved', description: data?.message || 'Settings saved.' });
    } catch (e) {
      toast({ title: 'Failed', description: e.response?.data?.message || 'Could not save.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;
  if (!form) return <div className="p-8 text-red-600">Could not load notification settings.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">Choose where each kind of message goes and confirm delivery works.</p>
      </div>

      {/* Master switches */}
      <div className="flex flex-wrap gap-3">
        <Toggle label="Email" checked={form.emailEnabled} onChange={v => set('emailEnabled', v)} />
        <Toggle label="SMS" checked={form.smsEnabled} onChange={v => set('smsEnabled', v)} />
      </div>

      {/* Per-event emails */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-gray-900 mb-4"><Mail className="h-4 w-4 text-blue-600" /> Recipient inboxes</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {EMAIL_FIELDS.map(f => (
            <Field key={f.key} label={f.label} hint={f.hint} value={form[f.key]}
              type={f.key === 'fromEmail' ? 'email' : 'email'} onChange={v => set(f.key, v)} />
          ))}
        </div>
      </section>

      {/* SMS provider */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-gray-900 mb-4"><MessageSquare className="h-4 w-4 text-blue-600" /> SMS provider</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Provider</span>
            <select value={form.smsProvider || ''} onChange={e => set('smsProvider', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">Use server default</option>
              <option value="log">Log only (no real SMS)</option>
              <option value="msg91">MSG91</option>
              <option value="twilio">Twilio</option>
            </select>
            <span className="block text-[11px] text-gray-400 mt-0.5">Pick MSG91 or Twilio to actually send SMS.</span>
          </label>
          <Field label="Sender ID" type="text" value={form.smsSenderId} onChange={v => set('smsSenderId', v)} placeholder="NAVGRW" hint="6-char DLT-approved sender (India)" />
        </div>

        {form.smsProvider === 'msg91' && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="MSG91 Auth Key" type="text" value={form.msg91AuthKeyNew}
              onChange={v => set('msg91AuthKeyNew', v)}
              placeholder={form.msg91AuthKeyMask || 'Enter auth key'} hint={form.msg91AuthKeyMask ? `Saved: ${form.msg91AuthKeyMask}. Leave blank to keep.` : 'Required'} />
            <Field label="OTP Template ID" type="text" value={form.msg91TemplateId} onChange={v => set('msg91TemplateId', v)} placeholder="DLT template id" hint="For OTP messages" />
          </div>
        )}
        {form.smsProvider === 'twilio' && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="Account SID" type="text" value={form.twilioAccountSidNew}
              onChange={v => set('twilioAccountSidNew', v)}
              placeholder={form.twilioAccountSidMask || 'AC…'} hint={form.twilioAccountSidMask ? `Saved: ${form.twilioAccountSidMask}. Leave blank to keep.` : 'Required'} />
            <Field label="Auth Token" type="text" value={form.twilioAuthTokenNew}
              onChange={v => set('twilioAuthTokenNew', v)}
              placeholder={form.twilioAuthTokenMask || 'token'} hint={form.twilioAuthTokenMask ? `Saved: ${form.twilioAuthTokenMask}. Leave blank to keep.` : 'Required'} />
            <Field label="From Number" type="text" value={form.twilioFromNumber} onChange={v => set('twilioFromNumber', v)} placeholder="+1…" hint="Your Twilio number" />
          </div>
        )}
      </section>

      {/* Per-event DLT/MSG91 Flow template IDs — only relevant for MSG91 */}
      {form.smsProvider === 'msg91' && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-gray-900 mb-1"><MessageSquare className="h-4 w-4 text-blue-600" /> Transactional SMS templates (DLT)</h2>
          <p className="text-[11px] text-gray-500 mb-4">
            Paste the approved MSG91 Flow / DLT template ID for each event. Each transactional SMS
            sends using its own template — see DLT_SMS_TEMPLATES_MSG91_SETUP.md for the exact
            template text to register (C2–C12). Leave blank until approved.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ['tplOrderCod',        'Order confirmed — COD (C3)'],
              ['tplOrderOnline',     'Order confirmed — online (C4)'],
              ['tplOrderShipped',    'Order shipped (C5)'],
              ['tplOrderDelivered',  'Order delivered (C6)'],
              ['tplOrderCancelled',  'Order cancelled (C7)'],
              ['tplOrderProcessing', 'Order processing (C8)'],
              ['tplOrderRefunded',   'Order refunded (C9)'],
              ['tplRfqReceived',     'RFQ received (C11)'],
              ['tplRfqReady',        'RFQ quote ready (C12)'],
              ['tplWelcome',         'Welcome / registration (C2)'],
              ['tplPasswordChanged', 'Password changed (C10)'],
            ].map(([key, label]) => (
              <Field key={key} label={label} type="text" value={form[key]}
                onChange={v => set(key, v)} placeholder="DLT template id" />
            ))}
          </div>
        </section>
      )}

      <button onClick={save} disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl brand-gradient text-white font-bold hover:opacity-90 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
      </button>

      {/* Test sends */}
      <section className="bg-blue-50/60 rounded-2xl border border-blue-100 p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-bold text-gray-900"><CheckCircle className="h-4 w-4 text-emerald-600" /> Test your setup</h2>
        <p className="text-xs text-gray-500 -mt-1">Save first, then send yourself a test to confirm delivery.</p>
        <TestRow icon={Mail} label="Test email" onTest={notificationSettingsApi.testEmail} />
        <TestRow icon={MessageSquare} label="Test SMS" onTest={notificationSettingsApi.testSms} />
        <div className="flex items-start gap-2 text-[11px] text-gray-500 pt-1">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          If a test fails, the message shows the reason. SMS needs a provider (MSG91/Twilio) set above — “Log only” never sends real SMS.
        </div>
      </section>
    </div>
  );
};

export default AdminNotifications;
