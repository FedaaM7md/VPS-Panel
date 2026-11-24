/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t, tm } from '../i18n';
import { getStore } from '../state/store';
import { getCsrfToken } from '../lib/csrf';
import { navigate } from '../lib/navigation';
import { collectSshKeys } from '../data/seed';
import { getOs, getPlan, OS_IMAGES, PLANS, REGIONS } from '../data/catalog';
import { formatMoney, formatNumber, formatStorage } from '../lib/format';
import {
  createEmptyDraft,
  stepAfter,
  stepBefore,
  stepIndex,
  validateStep,
  WIZARD_STEPS,
  type WizardContext,
  type WizardDraft,
  type WizardErrors,
  type WizardStep,
} from '../lib/wizard';
import { h, replaceChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import { pageHeader, notice, sectionCard } from '../ui/components';
import { demoBadge, rdpBadge } from '../ui/badges';
import { osName, planName, planDescription, regionName, regionZone } from '../ui/labels';
import { toast } from '../ui/toast';
import type { PageInstance } from './types';

const STEP_ICONS: Record<WizardStep, Parameters<typeof icon>[0]> = {
  basics: 'server',
  plan: 'layers',
  region: 'mapPin',
  image: 'monitor',
  access: 'key',
  review: 'checkCircle',
};

export function renderCreateServer(): PageInstance {
  const store = getStore();
  const lang = store.getState().settings.lang;
  const draft: WizardDraft = createEmptyDraft();
  let step: WizardStep = 'basics';
  let errors: WizardErrors = {};

  const stepperHost = h('ol', { class: 'mb-4 flex gap-1 overflow-x-auto rounded-xl border p-1.5 scrollbar-none', style: 'border-color: var(--line); background-color: var(--surface);' });
  const stepHost = h('div');
  const summaryHost = h('div');
  const errorSummary = h('div', { class: 'mb-3', role: 'alert', 'aria-live': 'assertive' });

  function context(): WizardContext {
    const state = store.getState();
    return {
      existingNames: state.servers.map((server) => server.name),
      availableKeyIds: collectSshKeys(state.servers).map((key) => key.id),
    };
  }

  function renderStepper(): void {
    const currentIndex = stepIndex(step);
    replaceChildren(
      stepperHost,
      ...WIZARD_STEPS.map((item, index) => {
        const isCurrent = item === step;
        const isDone = index < currentIndex;
        return h(
          'li',
          { class: 'min-w-0 flex-1' },
          h(
            'button',
            {
              type: 'button',
              class: 'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start transition-colors sm:px-2.5',
              style: isCurrent ? 'background-color: var(--surface-3);' : '',
              disabled: index >= currentIndex,
              'aria-current': isCurrent ? 'step' : undefined,
              onClick: () => {
                if (index < currentIndex) {
                  step = item;
                  errors = {};
                  renderAll();
                }
              },
            },
            h(
              'span',
              {
                class: 'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                style: isDone
                  ? 'background-color: var(--color-accent-600); color: white;'
                  : isCurrent
                    ? 'background-color: var(--color-brand-600); color: white;'
                    : 'background-color: var(--surface-3); color: var(--ink-soft);',
              },
              isDone ? icon('check', 'size-3.5') : String(index + 1),
            ),
            h(
              'span',
              { class: 'min-w-0' },
              h('span', { class: `block truncate text-[11px] font-bold ${isCurrent ? '' : 'muted'}` }, tm(`wizard.steps.${item}`)),
            ),
          ),
        );
      }),
    );
  }

  function fieldError(field: keyof WizardErrors): HTMLElement | null {
    const code = errors[field];
    return code ? h('p', { class: 'error-text' }, tm(code)) : null;
  }

  function optionClass(selected: boolean): string {
    return `relative w-full rounded-xl border p-3.5 text-start transition-all ${selected ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/25' : 'hover:border-brand-500/40'}`;
  }

  function selectOption(callback: () => void): void {
    callback();
    errors = {};
    renderAll();
  }

  function buildBasics(): HTMLElement {
    const nameInput = h('input', {
      id: 'wizard-name',
      class: 'input',
      value: draft.name,
      maxlength: '32',
      placeholder: t('wizard.namePlaceholder'),
      autocomplete: 'off',
      'aria-invalid': errors.name ? 'true' : undefined,
      'aria-describedby': 'wizard-name-error',
      onInput: (event: Event) => {
        draft.name = (event.target as HTMLInputElement).value;
        renderSummary();
      },
    });
    return h(
      'div',
      { class: 'space-y-4' },
      h(
        'div',
        null,
        h('label', { class: 'label', for: 'wizard-name' }, t('wizard.nameLabel')),
        nameInput,
        h('p', { class: 'hint' }, t('wizard.nameHint')),
        h('div', { id: 'wizard-name-error' }, fieldError('name')),
      ),
      notice({
        tone: 'info',
        title: t('wizard.steps.basics'),
        text: t('demo.notice'),
        iconName: 'info',
      }),
    );
  }

  function buildPlan(): HTMLElement {
    return h(
      'div',
      { class: 'space-y-3' },
      h('p', { class: 'muted text-sm leading-6' }, t('wizard.planHint')),
      h(
        'div',
        { class: 'grid gap-3 sm:grid-cols-2', role: 'radiogroup', 'aria-label': t('wizard.planLabel') },
        ...PLANS.map((plan) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(draft.planId === plan.id),
              class: optionClass(draft.planId === plan.id),
              style: draft.planId === plan.id ? '' : 'border-color: var(--line);',
              onClick: () => {
                selectOption(() => {
                  draft.planId = plan.id;
                  if (draft.osId && getOs(draft.osId).rdp !== plan.rdp) draft.osId = null;
                });
              },
            },
            h(
              'div',
              { class: 'flex items-start justify-between gap-2' },
              h(
                'div',
                null,
                h('p', { class: 'flex items-center gap-2 text-sm font-bold' }, planName(plan.id), plan.popular ? h('span', { class: 'badge bg-accent-500/15 text-accent-700 dark:text-accent-300' }, t('billing.popular')) : null),
                h('p', { class: 'muted mt-0.5 text-[11px] leading-5' }, planDescription(plan.id)),
              ),
              h('p', { class: 'shrink-0 text-end text-sm font-extrabold text-brand-600' }, formatMoney(plan.priceUsd, lang), h('span', { class: 'block text-[9px] font-medium muted' }, t('billing.perMonth'))),
            ),
            h(
              'div',
              { class: 'mt-3 flex flex-wrap gap-1.5' },
              h('span', { class: 'chip' }, `${plan.vcpu} vCPU`),
              h('span', { class: 'chip' }, `${plan.ramGb} GB`),
              h('span', { class: 'chip' }, `${plan.diskGb} GB`),
              plan.rdp ? rdpBadge() : null,
            ),
          ),
        ),
      ),
      fieldError('planId'),
    );
  }

  function buildRegion(): HTMLElement {
    return h(
      'div',
      { class: 'space-y-3' },
      h('p', { class: 'muted text-sm leading-6' }, t('wizard.regionHint')),
      h(
        'div',
        { class: 'grid gap-2 sm:grid-cols-2', role: 'radiogroup', 'aria-label': t('wizard.regionLabel') },
        ...REGIONS.map((region) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(draft.regionId === region.id),
              class: optionClass(draft.regionId === region.id),
              style: draft.regionId === region.id ? '' : 'border-color: var(--line);',
              onClick: () => selectOption(() => {
                draft.regionId = region.id;
              }),
            },
            h(
              'div',
              { class: 'flex items-center justify-between gap-2' },
              h('div', { class: 'flex items-center gap-2' }, icon('mapPin', 'size-4 text-brand-600'), h('span', { class: 'text-sm font-bold' }, regionName(region.id))),
              h('span', { class: 'chip font-mono' }, region.code),
            ),
            h('div', { class: 'mt-2 flex items-center justify-between text-[10px]' }, h('span', { class: 'soft' }, regionZone(region.id)), h('span', { class: 'soft' }, t('regions.latency', { ms: formatNumber(region.latencyMs, lang) }))),
          ),
        ),
      ),
      fieldError('regionId'),
    );
  }

  function buildImage(): HTMLElement {
    return h(
      'div',
      { class: 'space-y-3' },
      h('p', { class: 'muted text-sm leading-6' }, t('wizard.imageHint')),
      h(
        'div',
        { class: 'grid gap-2 sm:grid-cols-2', role: 'radiogroup', 'aria-label': t('wizard.imageLabel') },
        ...OS_IMAGES.map((image) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(draft.osId === image.id),
              class: optionClass(draft.osId === image.id),
              style: draft.osId === image.id ? '' : 'border-color: var(--line);',
              onClick: () => selectOption(() => {
                draft.osId = image.id;
              }),
            },
            h(
              'div',
              { class: 'flex items-start justify-between gap-2' },
              h(
                'div',
                { class: 'flex items-center gap-2.5' },
                h('span', { class: 'flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600' }, icon(image.family === 'windows' ? 'monitor' : 'terminal', 'size-4')),
                h('div', null, h('p', { class: 'text-sm font-bold' }, osName(image.id)), h('p', { class: 'soft text-[10px]' }, image.family === 'windows' ? t('images.windows') : t('images.linux'))),
              ),
              image.rdp ? rdpBadge() : null,
            ),
          ),
        ),
      ),
      fieldError('osId'),
    );
  }

  function passwordInput(id: string, label: string, onInput: (value: string) => void): HTMLElement {
    const input = h('input', { id, type: 'password', class: 'input', autocomplete: 'new-password', onInput: (event: Event) => onInput((event.target as HTMLInputElement).value) });
    return h(
      'div',
      null,
      h('label', { class: 'label', for: id }, label),
      input,
    );
  }

  function buildAccess(): HTMLElement {
    const keys = collectSshKeys(store.getState().servers);
    const isRdp = draft.planId ? getPlan(draft.planId).rdp : false;

    return h(
      'div',
      { class: 'space-y-4' },
      h(
        'div',
        { class: 'grid gap-3 sm:grid-cols-2', role: 'radiogroup', 'aria-label': t('wizard.accessLabel') },
        ...[
          { id: 'key' as const, iconName: 'key' as const, title: t('wizard.authKey'), text: t('wizard.authKeyText') },
          { id: 'password' as const, iconName: 'lock' as const, title: t('wizard.authPassword'), text: t('wizard.authPasswordText') },
        ].map((method) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': String(draft.authMethod === method.id),
              class: optionClass(draft.authMethod === method.id),
              style: draft.authMethod === method.id ? '' : 'border-color: var(--line);',
              onClick: () => selectOption(() => {
                draft.authMethod = method.id;
              }),
            },
            h('span', { class: 'text-brand-600' }, icon(method.iconName, 'size-5')),
            h('p', { class: 'mt-2 text-sm font-bold' }, method.title),
            h('p', { class: 'muted mt-0.5 text-[11px] leading-5' }, method.text),
          ),
        ),
      ),
      draft.authMethod === 'key'
        ? h(
            'div',
            { class: 'rounded-xl border p-3.5', style: 'border-color: var(--line);' },
            h('p', { class: 'text-sm font-bold' }, t('wizard.keySelect')),
            h('p', { class: 'muted mt-0.5 text-[11px]' }, t('wizard.keySelectHint')),
            keys.length === 0
              ? h(
                  'div',
                  { class: 'mt-2 space-y-2' },
                  h('p', { class: 'text-xs text-amber-700 dark:text-amber-300' }, t('wizard.noKeys')),
                  h('a', { href: '#/servers', class: 'text-xs font-semibold text-brand-600 hover:underline' }, t('nav.servers')),
                )
              : h(
                  'ul',
                  { class: 'mt-2 space-y-1.5' },
                  ...keys.map((key) => {
                    const checkbox = h('input', {
                      type: 'checkbox',
                      class: 'size-4 accent-teal-600',
                      checked: draft.keyIds.includes(key.id),
                      onChange: (event: Event) => {
                        const checked = (event.target as HTMLInputElement).checked;
                        draft.keyIds = checked ? [...draft.keyIds, key.id] : draft.keyIds.filter((id) => id !== key.id);
                        renderSummary();
                      },
                    });
                    return h(
                      'li',
                      null,
                      h(
                        'label',
                        { class: 'flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 hover:bg-[color:var(--surface-2)]', style: 'border-color: var(--line);' },
                        checkbox,
                        h('span', { class: 'min-w-0 flex-1' }, h('span', { class: 'block text-xs font-semibold' }, key.name), h('span', { class: 'soft block truncate font-mono text-[9px]' }, key.fingerprint)),
                        demoBadge(),
                      ),
                    );
                  }),
                ),
            fieldError('keyIds'),
          )
        : h(
            'div',
            { class: 'space-y-3 rounded-xl border p-3.5', style: 'border-color: var(--line);' },
            passwordInput('wizard-password', t('wizard.passwordLabel'), (value) => {
              draft.password = value;
            }),
            h('p', { class: 'hint' }, t('wizard.passwordHint')),
            fieldError('password'),
            passwordInput('wizard-password-confirm', t('wizard.confirmPassword'), (value) => {
              draft.confirmPassword = value;
            }),
            fieldError('confirmPassword'),
            notice({ tone: 'warning', title: t('server.sshPrivateNotice'), text: t('demo.localOnly') }),
          ),
      isRdp
        ? h(
            'div',
            null,
            h('label', { class: 'label', for: 'wizard-rdp-user' }, t('wizard.rdpUser')),
            h('input', {
              id: 'wizard-rdp-user',
              class: 'input',
              value: draft.rdpUser,
              maxlength: '32',
              autocomplete: 'username',
              onInput: (event: Event) => {
                draft.rdpUser = (event.target as HTMLInputElement).value;
              },
            }),
            h('p', { class: 'hint' }, t('wizard.rdpUserHint')),
            fieldError('rdpUser'),
          )
        : null,
    );
  }

  function buildReview(): HTMLElement {
    const plan = draft.planId ? getPlan(draft.planId) : null;
    const keys = draft.authMethod === 'key' ? collectSshKeys(store.getState().servers).filter((key) => draft.keyIds.includes(key.id)) : [];

    const row = (label: string, value: string): HTMLElement => h('div', { class: 'flex items-start justify-between gap-4 border-b py-2.5 text-xs last:border-0', style: 'border-color: var(--line);' }, h('dt', { class: 'soft' }, label), h('dd', { class: 'text-end font-semibold' }, value));

    return h(
      'div',
      { class: 'grid gap-4 lg:grid-cols-2' },
      h(
        'div',
        { class: 'rounded-xl border p-4', style: 'border-color: var(--line);' },
        h('p', { class: 'mb-1 text-sm font-bold' }, t('wizard.summary')),
        h(
          'dl',
          null,
          row(t('wizard.nameLabel'), draft.name || '—'),
          row(t('common.plan'), plan ? planName(plan.id) : '—'),
          row(t('common.region'), draft.regionId ? regionName(draft.regionId) : '—'),
          row(t('common.image'), draft.osId ? osName(draft.osId) : '—'),
          row(
            t('wizard.accessLabel'),
            draft.authMethod === 'key'
              ? `${t('wizard.authKey')} (${formatNumber(keys.length, lang)})`
              : t('wizard.authPassword'),
          ),
          plan?.rdp ? row(t('wizard.rdpUser'), draft.rdpUser || 'Administrator') : null,
        ),
      ),
      h(
        'div',
        { class: 'space-y-3' },
        plan
          ? h(
              'div',
              { class: 'rounded-xl border border-brand-500/30 bg-brand-500/5 p-4' },
              h('p', { class: 'soft text-[10px] font-semibold uppercase' }, t('wizard.monthly')),
              h('p', { class: 'mt-1 text-3xl font-extrabold tabular-nums text-brand-700 dark:text-brand-300' }, formatMoney(plan.priceUsd, lang), h('span', { class: 'text-xs font-semibold muted' }, t('common.perMonth'))),
              h(
                'div',
                { class: 'mt-2 flex flex-wrap gap-1.5' },
                h('span', { class: 'chip' }, `${formatNumber(plan.vcpu, lang)} vCPU`),
                h('span', { class: 'chip' }, formatStorage(plan.ramGb, lang)),
                h('span', { class: 'chip' }, formatStorage(plan.diskGb, lang)),
                h('span', { class: 'chip' }, `${formatNumber(plan.bandwidthTb, lang)} TB`),
              ),
            )
          : null,
        notice({ tone: 'info', title: t('wizard.willBeCreated'), text: t('wizard.willBeCreatedText'), iconName: 'clock' }),
        draft.authMethod === 'key' && keys.length > 0
          ? h(
              'div',
              { class: 'rounded-xl border p-3', style: 'border-color: var(--line);' },
              h('p', { class: 'text-[10px] font-semibold uppercase soft' }, t('wizard.keySelect')),
              h('ul', { class: 'mt-1.5 space-y-1' }, ...keys.map((key) => h('li', { class: 'flex items-center gap-1.5 text-xs' }, icon('key', 'size-3.5 text-brand-600'), key.name))),
            )
          : null,
      ),
    );
  }

  function buildStepContent(): HTMLElement {
    switch (step) {
      case 'basics':
        return buildBasics();
      case 'plan':
        return buildPlan();
      case 'region':
        return buildRegion();
      case 'image':
        return buildImage();
      case 'access':
        return buildAccess();
      case 'review':
        return buildReview();
    }
  }

  function renderSummary(): void {
    const plan = draft.planId ? getPlan(draft.planId) : null;
    replaceChildren(
      summaryHost,
      sectionCard({
        title: t('wizard.summary'),
        body: [
          h(
            'dl',
            { class: 'space-y-2.5 text-xs' },
            h('div', { class: 'flex justify-between gap-3' }, h('dt', { class: 'soft' }, t('common.plan')), h('dd', { class: 'text-end font-semibold' }, plan ? planName(plan.id) : t('common.noneSelected'))),
            h('div', { class: 'flex justify-between gap-3' }, h('dt', { class: 'soft' }, t('common.region')), h('dd', { class: 'text-end font-semibold' }, draft.regionId ? regionName(draft.regionId) : t('common.noneSelected'))),
            h('div', { class: 'flex justify-between gap-3' }, h('dt', { class: 'soft' }, t('common.image')), h('dd', { class: 'text-end font-semibold' }, draft.osId ? osName(draft.osId) : t('common.noneSelected'))),
          ),
          h('div', { class: 'my-3 border-t', style: 'border-color: var(--line);' }),
          h('div', { class: 'flex items-end justify-between gap-2' }, h('span', { class: 'text-xs font-semibold' }, t('wizard.monthly')), h('span', { class: 'text-lg font-extrabold text-brand-600 tabular-nums' }, plan ? formatMoney(plan.priceUsd, lang) : '—')),
          h('div', { class: 'mt-3' }, demoBadge(t('wizard.demoWizard'))),
        ],
      }),
    );
  }

  function goNext(): void {
    const validation = validateStep(step, draft, context());
    if (Object.keys(validation).length > 0) {
      errors = validation;
      renderAll();
      const firstInvalid = stepHost.querySelector<HTMLElement>('[aria-invalid="true"], .error-text');
      firstInvalid?.focus();
      return;
    }
    errors = {};
    step = stepAfter(step);
    renderAll();
    document.getElementById('wizard-step-title')?.focus();
  }

  function goBack(): void {
    errors = {};
    step = stepBefore(step);
    renderAll();
    document.getElementById('wizard-step-title')?.focus();
  }

  function create(): void {
    const validation = validateStep('review', draft, context());
    if (Object.keys(validation).length > 0) {
      errors = validation;
      renderAll();
      return;
    }
    const result = store.createServer(draft, getCsrfToken());
    if (!result.ok) {
      toast('error', t('errors.generic'));
      return;
    }
    toast('success', t('wizard.created', { name: result.value.name }));
    navigate(`/servers/${result.value.id}`);
  }

  function buildFooter(): HTMLElement {
    const isReview = step === 'review';
    return h(
      'div',
      { class: 'mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4', style: 'border-color: var(--line);' },
      h(
        'div',
        { class: 'flex items-center gap-2' },
        h('a', { href: '#/servers', class: 'btn btn-ghost btn-sm' }, t('wizard.cancel')),
        step !== 'basics' ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onClick: goBack }, icon('arrowStart', 'size-3.5 flip-rtl'), t('wizard.prevStep')) : null,
      ),
      isReview
        ? h('button', { type: 'button', class: 'btn btn-primary', onClick: create }, icon('check', 'size-4'), t('wizard.create'))
        : h('button', { type: 'button', class: 'btn btn-primary', onClick: goNext }, t('wizard.nextStep'), icon('arrowEnd', 'size-4 flip-rtl')),
    );
  }

  function renderAll(): void {
    renderStepper();
    renderSummary();
    const summaryText =
      Object.keys(errors).length > 0
        ? notice({ tone: 'warning', title: t('wizard.validationTitle'), iconName: 'alertTriangle' })
        : null;
    replaceChildren(
      errorSummary,
      summaryText,
    );
    const plan = draft.planId ? getPlan(draft.planId) : null;
    replaceChildren(
      stepHost,
      h(
        'section',
        { class: 'card p-5' },
        h(
          'div',
          { class: 'mb-4 flex items-start justify-between gap-3' },
          h(
            'div',
            null,
            h(
              'p',
              { class: 'text-[10px] font-bold uppercase text-accent-600' },
              t('wizard.stepOf', { current: formatNumber(stepIndex(step) + 1, lang), total: formatNumber(WIZARD_STEPS.length, lang) }),
            ),
            h(
              'h2',
              { id: 'wizard-step-title', tabindex: '-1', class: 'mt-1 flex items-center gap-2 text-lg font-extrabold outline-none' },
              icon(STEP_ICONS[step], 'size-5 text-brand-600'),
              tm(`wizard.steps.${step}`),
            ),
          ),
          plan ? h('span', { class: 'badge border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-300' }, formatMoney(plan.priceUsd, lang), t('common.perMonth')) : null,
        ),
        errorSummary,
        buildStepContent(),
        buildFooter(),
      ),
    );
  }

  // Move the alert summary above the card heading visually within the step.
  const root = h(
    'div',
    null,
    pageHeader({
      title: t('wizard.title'),
      subtitle: t('wizard.subtitle'),
      actions: [demoBadge(), h('a', { href: '#/servers', class: 'btn btn-secondary btn-sm' }, icon('arrowStart', 'size-3.5 flip-rtl'), t('server.back'))],
    }),
    stepperHost,
    h(
      'div',
      { class: 'grid gap-5 xl:grid-cols-[1.7fr_1fr]' },
      h('div', null, stepHost),
      h(
        'div',
        { class: 'space-y-4' },
        summaryHost,
        notice({ tone: 'info', title: t('demo.simulated'), text: t('wizard.demoWizard'), iconName: 'shieldCheck' }),
        h(
          'div',
          { class: 'card p-4' },
          h('p', { class: 'text-xs font-bold' }, t('wizard.planIncludes')),
          h(
            'ul',
            { class: 'mt-2 space-y-1.5 text-[11px] muted' },
            ...[t('wizard.includesLinux'), t('wizard.includesWindows'), t('server.firewallTitle'), t('server.snapshotTitle')].map((item) => h('li', { class: 'flex items-center gap-1.5' }, icon('check', 'size-3.5 text-accent-600'), item)),
          ),
        ),
      ),
    ),
  );

  renderAll();

  const unsubscribe = store.subscribe(() => {
    // Only react to fleet changes while the wizard is mounted.
    renderSummary();
  });

  return {
    el: root,
    titleKey: 'wizard.title',
    destroy: unsubscribe,
  };
}
