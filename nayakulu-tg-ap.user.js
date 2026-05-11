// ==UserScript==
// @name         Nayakulu RM Auto Fill TG+AP
// @namespace    thecircleapp.in
// @version      2.0.0
// @description  Real Select2 role selection + RM text extraction + free text autofill
// @match        https://www.thecircleapp.in/admin/user_roles/new
// @match        https://www.thecircleapp.in/admin/user_roles/*/edit
// @match https://www.thecircleapp.in/admin/circles/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ───────────────── CONFIG ─────────────────

  let CURRENT_ROLE_ID = '937';
  let CURRENT_ROLE_TEXT = 'నాయకులు';
  let CURRENT_PARENT_CIRCLE_ID = null;
  let CURRENT_ICON_MATCH = null;
    let CURRENT_ICON_KEYWORD = null;

  const SELECT_SELECTOR   = '#user_role_role_id';
  const TEXTAREA_SELECTOR = '#user_role_free_text';
  const CHECKBOX_SELECTOR = '#user_role_is_self_claimed';
  const PARENT_CIRCLE_SELECTOR ='#user_role_parent_circle_id';
  const PARENT_CIRCLE_CONTAINER ='#select2-user_role_parent_circle_id-container';
  const ICON_SELECTOR ='#user_role_badge_icon_id';
  const ICON_CONTAINER ='#select2-user_role_badge_icon_id-container';

  const RM_CONTAINER_SELECTOR =
    '#user_role_delete_badge_text_from_rm_input';

  // ───────────────── HELPERS ─────────────────

  function log(...args) {
    console.log('[Nayakulu]', ...args);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function waitFor(fn, timeout = 8000, interval = 120) {
    return new Promise(resolve => {
      const start = Date.now();

      (function check() {
        const result = fn();

        if (result) return resolve(result);

        if (Date.now() - start >= timeout) {
          return resolve(null);
        }

        setTimeout(check, interval);
      })();
    });
  }
    window.extractPartyCircleId = async function(url) {

  return new Promise((resolve, reject) => {

    const iframe = document.createElement('iframe');

    iframe.style.display = 'none';
    iframe.src = url;

    iframe.onload = () => {

      try {

        const doc = iframe.contentDocument;

        const rows = [...doc.querySelectorAll('tr')];

        let circleId = null;

        for (const row of rows) {

          const th = row.querySelector('th');
          const td = row.querySelector('td');

          if (!th || !td) continue;

          const label = th.innerText.trim();

          if (label === 'ID') {

            circleId = td.innerText.trim();
            break;
          }
        }

        iframe.remove();

        if (!circleId) {
          reject('Party circle ID not found');
          return;
        }

        resolve(circleId);

      } catch (err) {

        iframe.remove();
        reject(err);
      }
    };

    document.body.appendChild(iframe);

  });
}
    function submitUserRole() {

  const btn = [...document.querySelectorAll('input, button')]
    .find(el =>
      el.value === 'Create User role' ||
      el.textContent?.includes('Create User role')
    );

  if (!btn) {
    throw new Error(
      'Create User role button not found'
    );
  }

  btn.click();

  log('Create User role clicked');
}

  // ───────────────── SELECT2 FLOW ─────────────────

  function openSelect2() {
    const $ = window.jQuery || window.$;

    if (!$) {
      throw new Error('jQuery not found');
    }

    const select = document.querySelector(SELECT_SELECTOR);

    if (!select) {
      throw new Error('Role select not found');
    }

    const $select = $(select);

    if (!$select.data('select2')) {
      throw new Error('Select2 not initialized');
    }

    log('Opening Select2');

    $select.select2('open');
  }

  async function typeSearch(term) {
    const input = await waitFor(() => {
      return document.querySelector(
        '.select2-dropdown .select2-search__field'
      );
    });

    if (!input) {
      throw new Error('Search input not found');
    }

    input.focus();
    input.value = '';

    for (const char of term) {
      input.value += char;

      input.dispatchEvent(
        new Event('input', { bubbles: true })
      );

      await sleep(35);
    }

    log('Typed:', term);
  }

  async function waitForResult() {
    return await waitFor(() => {

      const results = document.querySelectorAll(
        '.select2-results__option:not(.select2-results__option--loading)'
      );

      for (const li of results) {

        const text = li.textContent.trim();

        if (
        text.includes(CURRENT_ROLE_TEXT)
        ) {
          log('Matched result:', text);
          return li;
        }
      }

      return null;

    }, 8000);
  }

  function selectResult(liElement) {

  log('Selecting:', liElement.textContent.trim());

  // Real user interaction sequence
  liElement.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true
  }));

  liElement.dispatchEvent(new MouseEvent('mousedown', {
    bubbles: true
  }));

  liElement.dispatchEvent(new MouseEvent('mouseup', {
    bubbles: true
  }));

  liElement.dispatchEvent(new MouseEvent('click', {
    bubbles: true
  }));
}
    async function selectSelect2Option({

  containerSelector,
  searchTerm,
  matchText

}) {

  const $ = window.jQuery || window.$;

  const container = document.querySelector(
    containerSelector
  );

  if (!container) {
    throw new Error(
      `Select2 container not found: ${containerSelector}`
    );
  }

  $(container).select2('open');

  await sleep(250);

  const input = await waitFor(() => {
    return document.querySelector(
      '.select2-dropdown .select2-search__field'
    );
  });

  if (!input) {
    throw new Error('Select2 search input not found');
  }

  input.focus();

  input.value = '';

  for (const char of searchTerm) {

    input.value += char;

    input.dispatchEvent(
      new Event('input', { bubbles: true })
    );

    await sleep(35);
  }

  const result = await waitFor(() => {

    const results = document.querySelectorAll(
      '.select2-results__option:not(.select2-results__option--loading)'
    );

    for (const li of results) {

      const text = li.textContent.trim();

      if (text.includes(matchText)) {
        return li;
      }
    }

    return null;

  }, 8000);

  if (!result) {
    throw new Error(
      `No Select2 result found for ${matchText}`
    );
  }

  selectResult(result);
}

  // ───────────────── WAIT FOR UI ─────────────────

  async function waitForTextareaEnabled() {

    log('Waiting for textarea unlock');

    const textarea = await waitFor(() => {

      const el = document.querySelector(TEXTAREA_SELECTOR);

      if (!el) return null;

      if (el.disabled) return null;

      return el;

    }, 12000);

    return textarea;
  }

  // ───────────────── RM EXTRACTION ─────────────────

 function extractRMText() {

  const wrapper = document.querySelector(
    '#badge_free_text_deletion_wrapper'
  );

  if (!wrapper) {
    log('RM wrapper not found');
    return null;
  }

  const hint = wrapper.querySelector('p.inline-hints');

  if (!hint) {
    log('RM inline hint not found');
    return null;
  }

  const fullText = hint.textContent.trim();

  log('RM full text:', fullText);

  // extract quoted payload
  const match = fullText.match(/"([^"]+)"/);

  if (!match?.[1]) {
    log('Quoted payload not found');
    return null;
  }

  const extracted = match[1].trim();

  log('Extracted RM payload:', extracted);

  return extracted;
}
    function checkDeleteBadgeTextRM() {

  const wrapper = document.querySelector(
    '#badge_free_text_deletion_wrapper'
  );

  if (!wrapper) {
    log('Delete RM wrapper not found');
    return;
  }

  const checkbox = wrapper.querySelector(
    'input[type="checkbox"]'
  );

  if (!checkbox) {
    log('Delete RM checkbox not found');
    return;
  }

  if (!checkbox.checked) {

    checkbox.click();

    checkbox.dispatchEvent(
      new Event('change', { bubbles: true })
    );

    log('Delete Badge Text from RM checked');
  }
}
  // ───────────────── FILL ─────────────────

  function fillTextarea(textarea, text) {

    if (!text) {
      log('No text to inject');
      return;
    }

    log('Injecting text');

    textarea.focus();
    textarea.value = text;
    textarea.setAttribute('value', text);

    textarea.dispatchEvent(
      new Event('input', { bubbles: true })
    );

    textarea.dispatchEvent(
      new Event('change', { bubbles: true })
    );

    textarea.blur();
  }

  function checkSelfClaimed() {

    const cb = document.querySelector(
      CHECKBOX_SELECTOR
    );

    if (!cb) {
      log('Checkbox not found');
      return;
    }

    if (!cb.checked) {

      cb.checked = true;

      cb.dispatchEvent(
        new Event('change', { bubbles: true })
      );

      log('Checkbox checked');
    }
  }
async function applyParentCircle() {

  if (!CURRENT_PARENT_CIRCLE_ID) {

    log('No parent circle mapping');
    return;
  }

  log(
    'Applying parent circle:',
    CURRENT_PARENT_CIRCLE_ID
  );

  await selectSelect2Option({

    containerSelector:
      PARENT_CIRCLE_SELECTOR,

    searchTerm:
      CURRENT_PARENT_CIRCLE_ID,

    matchText:
      CURRENT_PARENT_CIRCLE_ID
  });

  log('Parent circle applied');
}
    async function applyIcon() {

  if (!CURRENT_ICON_MATCH) {

    log('No icon mapping');
    return;
  }

  log(
    'Applying icon:',
    CURRENT_ICON_MATCH
  );

  await selectSelect2Option({

    containerSelector:
      ICON_SELECTOR,

    searchTerm:
  CURRENT_ICON_KEYWORD,

    matchText:
      CURRENT_ICON_MATCH
  });

  log('Icon applied');
}
  // ───────────────── MAIN FLOW ─────────────────

  async function runFlow() {

    try {

      log('=== START ===');

const startTime = performance.now();

      // 1. open dropdown
      openSelect2();

      await sleep(250);

      // 2. type 937
    await typeSearch(CURRENT_ROLE_ID);

      await sleep(350);

      // 3. wait ajax result
      const result = await waitForResult();

      if (!result) {
        throw new Error('Role result not found');
      }

      // 4. select result
      selectResult(result);

      // 5. wait actual UI unlock
      const textarea =
        await waitForTextareaEnabled();

      if (!textarea) {
        throw new Error(
          'Textarea never enabled'
        );
      }

      log('Textarea enabled');

      // let Rails finish DOM updates
      await sleep(250);

      // 6. extract RM payload
      // 6. check RM delete checkbox
checkDeleteBadgeTextRM();

await sleep(150);

// 7. extract RM payload
const rmText = extractRMText();

      // 7. inject
      fillTextarea(textarea, rmText);

      // 8. checkbox
      checkSelfClaimed();

await sleep(250);

await applyParentCircle();

await sleep(250);

await applyIcon();

await sleep(300);

submitUserRole();

const endTime = performance.now();

const seconds =
  ((endTime - startTime) / 1000)
    .toFixed(2);

log(
  `=== COMPLETE (${seconds}s) ===`
);

alert(
  `Automation completed in ${seconds}s`
);

    } catch (err) {

      console.error(
        '[Nayakulu] FLOW FAILED:',
        err
      );

      alert(
        'Nayakulu flow failed:\n\n' +
        err.message
      );
    }
  }

  // ───────────────── BUTTON ─────────────────
const categories = [

  {
    label: '⚡ Nayakulu',
    presets: [

      {
        id: '937',
        text: 'నాయకులు',
        label: 'YCP Nayakulu',

        parentCircleId: '31403',

        iconKeyword: 'ycp',
        iconMatch: 'YCP WHITE'
      },

      {
        id: '937',
        text: 'నాయకులు',
        label: 'TDP Nayakulu',

        parentCircleId: '31402',

        iconKeyword: 'tdp',
        iconMatch: 'TDP WHITE'
      },

      {
        id: '937',
        text: 'నాయకులు',
        label: 'JSP Nayakulu',

        parentCircleId: '31406',

        iconKeyword: 'jsp',
        iconMatch: 'JSP WHITE'
      },

      {
        id: '937',
        text: 'నాయకులు',
        label: 'BRS Nayakulu',

        parentCircleId: '31405',

        iconKeyword: 'brs',
        iconMatch: 'BRS WHITE'
      },

      {
        id: '937',
        text: 'నాయకులు',
        label: 'BJP TG Nayakulu',

        parentCircleId: '31398',

        iconKeyword: 'bjp tg',
        iconMatch: 'BJP TG WHITE'
      },

      {
        id: '937',
        text: 'నాయకులు',
        label: 'BJP AP Nayakulu',

        parentCircleId: '37788',

        iconKeyword: 'bjp ap',
        iconMatch: 'BJP AP WHITE'
      },

      {
        id: '937',
        text: 'నాయకులు',
        label: 'Congress TG Nayakulu',

        parentCircleId: '31401',

        iconKeyword: 'congress tg',
        iconMatch: 'CONGRESS TG WHITE'
      },

      {
        id: '937',
        text: 'నాయకులు',
        label: 'Congress AP Nayakulu',

        parentCircleId: '37967',

        iconKeyword: 'congress ap',
        iconMatch: 'CONGRESS AP WHITE'
      }

    ]
  },

  {
    label: '⚡ Karyakarta',
    presets: [

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'YCP Karyakarta',

        parentCircleId: '31403',

        iconKeyword: 'ycp',
        iconMatch: 'YCP WHITE'
      },

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'TDP Karyakarta',

        parentCircleId: '31402',

        iconKeyword: 'tdp',
        iconMatch: 'TDP WHITE'
      },

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'JSP Karyakarta',

        parentCircleId: '31406',

        iconKeyword: 'jsp',
        iconMatch: 'JSP WHITE'
      },

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'BRS Karyakarta',

        parentCircleId: '31405',

        iconKeyword: 'brs',
        iconMatch: 'BRS WHITE'
      },

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'BJP TG Karyakarta',

        parentCircleId: '31398',

        iconKeyword: 'bjp tg',
        iconMatch: 'BJP TG WHITE'
      },

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'BJP AP Karyakarta',

        parentCircleId: '37788',

        iconKeyword: 'bjp ap',
        iconMatch: 'BJP AP WHITE'
      },

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'CONGRESS TG Karyakarta',

        parentCircleId: '31401',

        iconKeyword: 'INC tg',
        iconMatch: 'INC TG WHITE'
      },

      {
        id: '42',
        text: 'కార్యకర్త',
        label: 'Congress AP Karyakarta',

        parentCircleId: '37967',

        iconKeyword: 'INC ap',
        iconMatch: 'INC AP WHITE'
      }

    ]
  }

];
  function injectButton() {

    if (
      document.querySelector('#nayakulu-btn')
    ) return;

categories.forEach((category, catIndex) => {

  const categoryBtn =
    document.createElement('button');

  categoryBtn.textContent =
    category.label;

  Object.assign(categoryBtn.style, {
    position: 'fixed',
    bottom: `${24 + (catIndex * 58)}px`,
    right: '24px',
    zIndex: '999999',
    padding: '10px 18px',
    border: 'none',
    borderRadius: '8px',
    background: '#2563eb',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  });

  categoryBtn.addEventListener(
    'click',
    () => {

      document.querySelectorAll(
        '.party-preset-btn'
      ).forEach(el => el.remove());

      category.presets.forEach(
        (preset, presetIndex) => {

          const btn =
            document.createElement('button');

          btn.className =
            'party-preset-btn';

          btn.textContent =
            preset.label;

          Object.assign(btn.style, {
            position: 'fixed',
            bottom: `${24 + ((catIndex + presetIndex + 1) * 58)}px`,
            right: '180px',
            zIndex: '999999',
            padding: '10px 18px',
            border: 'none',
            borderRadius: '8px',
            background: '#16a34a',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          });

          btn.addEventListener(
            'click',
            async () => {

              CURRENT_ROLE_ID =
                preset.id;

              CURRENT_ROLE_TEXT =
                preset.text;

              CURRENT_PARENT_CIRCLE_ID =
                preset.parentCircleId;

              CURRENT_ICON_MATCH =
                preset.iconMatch;

                CURRENT_ICON_KEYWORD =
  preset.iconKeyword;
              btn.disabled = true;

              const original =
                preset.label;

              btn.textContent =
                '⏳ Running';

              await runFlow();

              btn.disabled = false;

              btn.textContent =
                original;
            }
          );

          document.body.appendChild(btn);
        }
      );
    }
  );

  document.body.appendChild(categoryBtn);

});

log('Category buttons injected');
  }

  // ───────────────── INIT ─────────────────

  waitFor(() => {
    return document.querySelector(
      SELECT_SELECTOR
    );
  }, 10000).then(found => {

    if (!found) {
      console.error(
        '[Nayakulu] Role select not found'
      );
      return;
    }

    injectButton();
  });

})();
