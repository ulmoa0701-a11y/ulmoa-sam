/* 일단 해봄 소통하기: 기존 Apps Script 양식의 audience select를 버튼형으로 개선
 * 기존 제출 로직(FormData)과 게시글/관리자 답글 데이터는 변경하지 않습니다.
 * 외부 스크립트 로드에 실패하면 원래 select가 그대로 나타납니다.
 */
(function () {
  "use strict";
  if (window.__habomRolePickerLoaded) return;
  window.__habomRolePickerLoaded = true;

  var GROUPS = [
    { name: "치료·상담 전문가", items: [
      "인지치료사", "학습치료사", "언어재활사", "청능재활사",
      "음악치료사", "놀이치료사", "미술치료사", "심리상담사",
      "임상심리사", "가족상담사", "행동중재 전문가",
      "작업치료사", "물리치료사", "감각통합 중재 종사자",
      "심리운동사", "독서치료사", "모래놀이치료사",
      "특수체육 지도자", "기타 치료·상담"
    ]},
    { name: "교육·보육 종사자", items: [
      "특수교사", "유치원교사", "초등교사", "중등교사",
      "보육교사", "장애영유아보육교사", "특수교육실무사",
      "통합교육 담당교사", "방과후교사", "돌봄교사",
      "교수·강사", "기타 교육·보육"
    ]},
    { name: "예비 전문가·전공생", items: [
      "예비 인지치료사", "예비 언어재활사", "예비 음악치료사",
      "예비 놀이치료사", "예비 미술치료사", "예비 작업치료사",
      "예비 심리상담사", "예비 특수교사", "예비 일반교사",
      "관련 전공 대학생", "대학원생", "실습생", "수련생",
      "자격 취득 준비생", "기타 예비 전문가"
    ]},
    { name: "의료·복지·연구", items: [
      "의사", "간호사", "사회복지사", "의료사회복지사",
      "복지·행정 담당자", "기관장·센터 운영자", "연구자",
      "교육콘텐츠 개발자", "관련 기관 종사자", "자원봉사자",
      "기타 관련 종사자"
    ]},
    { name: "보호자" },
    { name: "아동·청소년" },
    { name: "성인 이용자" },
    { name: "기타 방문자", items: [
      "일반 방문자", "자료 이용자", "교육·발달 분야 관심자",
      "기타 직접 입력"
    ]}
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function addStyle() {
    if (document.getElementById("habom-role-picker-style")) return;
    var style = el("style");
    style.id = "habom-role-picker-style";
    style.textContent = [
      "#habom-role-picker{margin:5px 0 0;width:100%;max-width:100%;font:inherit;color:#30443a}",
      "#habom-role-picker *{box-sizing:border-box}",
      "#habom-role-picker [hidden]{display:none!important}",
      "#habom-role-picker .hrp-trigger{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:48px;padding:10px 14px;border:1px solid #ccdcd3;border-radius:11px;background:#fff;color:#4a5b51;font:inherit;font-size:14px;font-weight:600;text-align:left;cursor:pointer;touch-action:manipulation}",
      "#habom-role-picker .hrp-trigger.hrp-chosen{background:#f2f9f4;color:#246044;border-color:#93b89f}",
      "#habom-role-picker .hrp-trigger:hover{border-color:#6e9f84}",
      "#habom-role-picker button:focus-visible,#habom-role-picker input:focus-visible{outline:3px solid #8ebba6;outline-offset:2px}",
      "#habom-role-picker .hrp-chevron{font-size:17px;color:#55876b;flex:none}",
      "#habom-role-picker .hrp-panel{margin-top:9px;padding:12px;border:1px solid #cfddd4;border-radius:13px;background:#fff;box-shadow:0 8px 20px rgba(21,58,37,.07)}",
      "#habom-role-picker .hrp-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;font-size:14px;font-weight:750;color:#2c5540}",
      "#habom-role-picker .hrp-back{padding:5px 3px;background:none;border:0;color:#4d8469;font:inherit;font-size:13px;font-weight:700;cursor:pointer}",
      "#habom-role-picker .hrp-hint{margin:0 0 11px;font-size:12px;line-height:1.5;color:#718077}",
      "#habom-role-picker .hrp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}",
      "#habom-role-picker .hrp-chip{display:block;width:100%;min-width:0;min-height:43px;padding:7px 6px;border:1px solid #d4e2d9;border-radius:10px;background:#fdfefd;color:#354d3f;font:inherit;font-size:12.5px;font-weight:650;line-height:1.3;text-align:center;overflow-wrap:anywhere;cursor:pointer;touch-action:manipulation}",
      "#habom-role-picker .hrp-chip:hover{background:#edf7f0;border-color:#83aa91}",
      "#habom-role-picker .hrp-chip[aria-pressed=true]{background:#e5f3e9;border:2px solid #548c72;color:#20593d;padding:6px 5px}",
      "#habom-role-picker .hrp-search{display:block;width:100%;min-height:43px;margin-bottom:9px;padding:9px 12px;border:1px solid #cfddd4;border-radius:10px;background:#fff;color:#30443a;font:inherit;font-size:13px}",
      "#habom-role-picker .hrp-detail-list{max-height:264px;overflow-y:auto;overscroll-behavior:contain;padding:1px 3px 3px 1px}",
      "#habom-role-picker .hrp-other{display:block;width:100%;min-height:43px;margin-top:9px;padding:9px 12px;border:1px solid #a6c8b3;border-radius:10px;background:#fff;color:#30443a;font:inherit;font-size:13px}",
      "#habom-role-picker .hrp-done{margin-top:9px;min-height:42px;width:100%;border:0;border-radius:10px;background:#3a7655;color:#fff;font:inherit;font-size:13px;font-weight:750;cursor:pointer}",
      "#habom-role-picker .hrp-reset{border:0;background:none;color:#588168;text-decoration:underline;text-underline-offset:3px;font:inherit;font-size:12px;cursor:pointer;padding:6px 2px}",
      "#habom-role-picker .hrp-footer{display:flex;justify-content:flex-end;margin-top:3px}",
      "#habom-role-picker .hrp-no-result{font-size:12px;color:#66756c;padding:11px 0}",
      "form select[name='kind']{height:48px!important;min-height:48px!important;max-height:48px!important;flex:0 0 48px!important;align-self:flex-start!important;padding:8px 12px!important;line-height:1.5!important}",
      "form .field:has(>select[name='kind']),form .field:has(select[name='kind']){justify-content:flex-start!important;align-self:start!important;gap:8px!important;min-height:0!important}",
      "form .field:has(input[name='anonymous']){justify-content:flex-start!important;align-items:center!important;gap:9px!important}",
      "form .field:has(input[name='anonymous']) label,form label:has(input[name='anonymous']),form label[for='anonymous']{white-space:nowrap!important;word-break:keep-all!important;width:auto!important;max-width:none!important;justify-content:flex-start!important}",
      "form input[name='anonymous'],form #anonymous{width:17px!important;height:17px!important;flex:0 0 17px!important;min-width:17px!important}",
      "@media(max-width:430px){#habom-role-picker .hrp-panel{padding:10px}#habom-role-picker .hrp-chip{font-size:12px;padding:7px 4px}#habom-role-picker .hrp-detail-list{max-height:220px}}",
      "@media(prefers-reduced-motion:reduce){#habom-role-picker *{scroll-behavior:auto!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function init() {
    var select = document.querySelector('select[name="audience"]');
    if (!select || select.dataset.habomRoleEnhanced === "yes") return;
    addStyle();

    var root = el("section");
    root.id = "habom-role-picker";
    root.setAttribute("aria-label", "방문자 역할 선택");
    var trigger = el("button", "hrp-trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "hrp-panel");
    var triggerLabel = el("span", "", "역할 선택 (선택사항)");
    var chevron = el("span", "hrp-chevron", "⌄");
    chevron.setAttribute("aria-hidden", "true");
    trigger.append(triggerLabel, chevron);

    var panel = el("div", "hrp-panel");
    panel.id = "hrp-panel";
    panel.hidden = true;
    var header = el("div", "hrp-panel-heading");
    var heading = el("strong", "", "어떤 분이신가요?");
    var back = el("button", "hrp-back", "← 분야 선택");
    back.type = "button";
    back.hidden = true;
    header.append(heading, back);
    var hint = el("p", "hrp-hint", "본인에게 가까운 항목을 하나 선택하면 돼요.");
    var categories = el("div", "hrp-grid");
    var detail = el("div");
    detail.hidden = true;
    var search = el("input", "hrp-search");
    search.type = "search";
    search.placeholder = "직업·분야 검색";
    search.setAttribute("aria-label", "세부 직업 검색");
    var detailList = el("div", "hrp-detail-list");
    var choices = el("div", "hrp-grid");
    var noResult = el("p", "hrp-no-result", "일치하는 항목이 없어요.");
    noResult.hidden = true;
    detailList.append(choices, noResult);
    var other = el("input", "hrp-other");
    other.type = "text";
    other.maxLength = 20;
    other.placeholder = "역할이나 직업을 입력해 주세요";
    other.setAttribute("aria-label", "직접 입력할 역할");
    other.hidden = true;
    var done = el("button", "hrp-done", "이 역할로 선택");
    done.type = "button";
    done.hidden = true;
    detail.append(search, detailList, other, done);
    panel.append(header, hint, categories, detail);
    var footer = el("div", "hrp-footer");
    var reset = el("button", "hrp-reset", "선택 해제");
    reset.type = "button";
    reset.hidden = true;
    footer.append(reset);
    root.append(trigger, panel, footer);

    var selected = "";
    var activeGroup = null;
    var itemButtons = [];

    function reportHeight() {
      var height = 680;
      Array.prototype.forEach.call(document.body.children, function(child) {
        var rect = child.getBoundingClientRect();
        if (rect.height > 0) height = Math.max(height, Math.ceil(rect.bottom + (window.scrollY || 0) + 20));
      });
      try { window.top.postMessage({ type: "habom-community-height-v1", height: height }, "*"); } catch (ignore) {}
    }
    function laterHeight() {
      window.requestAnimationFrame(reportHeight);
      window.setTimeout(reportHeight, 150);
    }

    function setAudience(value) {
      var normalized = String(value || "선택 안 함").trim().slice(0, 20) || "선택 안 함";
      var exists = Array.prototype.some.call(select.options, function(option) {
        return option.value === normalized;
      });
      if (!exists) {
        var option = document.createElement("option");
        option.value = normalized;
        option.textContent = normalized;
        select.add(option);
      }
      select.value = normalized;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      selected = normalized === "선택 안 함" ? "" : normalized;
      triggerLabel.textContent = selected || "역할 선택 (선택사항)";
      trigger.classList.toggle("hrp-chosen", !!selected);
      reset.hidden = !selected;
    }
    function showPanel(isOpen) {
      panel.hidden = !isOpen;
      trigger.setAttribute("aria-expanded", String(isOpen));
      chevron.textContent = isOpen ? "⌃" : "⌄";
      laterHeight();
    }
    function showCategories() {
      activeGroup = null;
      categories.hidden = false;
      detail.hidden = true;
      back.hidden = true;
      heading.textContent = "어떤 분이신가요?";
      hint.hidden = false;
      laterHeight();
    }
    function choose(value) {
      setAudience(value);
      showPanel(false);
    }
    function pickGroup(group) {
      if (!group.items) {
        choose(group.name);
        return;
      }
      activeGroup = group;
      heading.textContent = group.name;
      back.hidden = false;
      hint.hidden = true;
      categories.hidden = true;
      detail.hidden = false;
      search.value = "";
      other.hidden = true;
      done.hidden = true;
      other.value = "";
      choices.textContent = "";
      itemButtons = [];
      group.items.forEach(function(item) {
        var chip = el("button", "hrp-chip", item);
        chip.type = "button";
        chip.dataset.role = item;
        chip.addEventListener("click", function() {
          if (item.indexOf("기타") === 0) {
            other.hidden = false;
            other.value = "";
            done.hidden = false;
            other.focus();
            return;
          }
          choose(item);
        });
        choices.append(chip);
        itemButtons.push(chip);
      });
      noResult.hidden = true;
      laterHeight();
    }
    GROUPS.forEach(function(group) {
      var chip = el("button", "hrp-chip", group.name);
      chip.type = "button";
      chip.addEventListener("click", function() { pickGroup(group); });
      categories.append(chip);
    });
    search.addEventListener("input", function() {
      var q = search.value.trim().toLocaleLowerCase();
      var hits = 0;
      itemButtons.forEach(function(button) {
        var visible = button.textContent.toLocaleLowerCase().indexOf(q) !== -1;
        button.hidden = !visible;
        if (visible) hits += 1;
      });
      noResult.hidden = hits !== 0;
      laterHeight();
    });
    other.addEventListener("input", function() {
      done.disabled = !other.value.trim();
    });
    done.addEventListener("click", function() {
      if (other.value.trim()) choose(other.value);
    });
    back.addEventListener("click", showCategories);
    trigger.addEventListener("click", function() {
      if (panel.hidden) {
        showCategories();
        showPanel(true);
      } else {
        showPanel(false);
      }
    });
    reset.addEventListener("click", function() {
      setAudience("선택 안 함");
      showCategories();
      showPanel(false);
    });
    document.addEventListener("pointerdown", function(event) {
      if (!panel.hidden && !root.contains(event.target)) showPanel(false);
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && !panel.hidden) {
        showPanel(false);
        trigger.focus();
      }
    });
    select.insertAdjacentElement("beforebegin", root);
    setAudience("선택 안 함");
    select.dataset.habomRoleEnhanced = "yes";
    select.style.setProperty("display", "none", "important");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;
    var form = select.closest("form");
    if (form) {
      form.addEventListener("reset", function() {
        window.setTimeout(function() { reset.click(); }, 0);
      });
    }
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(laterHeight);
      observer.observe(document.body);
    }
    window.addEventListener("load", laterHeight);
    window.setTimeout(laterHeight, 500);
    window.setTimeout(laterHeight, 1800);
  }


  // 글쓰기 순서를 한 방향으로 정돈합니다. 기존 입력 요소를 이동하므로
  // FormData / google.script.run / 익명 처리 이벤트는 그대로 유지됩니다.
  function enhanceWritingFlow() {
    var roleSelect = document.querySelector('select[name="audience"]');
    var form = roleSelect && roleSelect.closest("form");
    if (!form || form.dataset.habomWriteFlow === "yes") return;
    var kindInput = form.querySelector('select[name="kind"]');
    var titleInput = form.querySelector('input[name="title"]');
    var bodyInput = form.querySelector('textarea[name="body"]');
    var nicknameInput = form.querySelector('input[name="nickname"]');
    var anonymousInput = form.querySelector('input[name="anonymous"], input#anonymous');
    var linkInput = form.querySelector('input[name="link"]');
    if (!kindInput || !bodyInput || !nicknameInput) return;

    function wholeField(control) {
      if (!control) return null;
      var node = control.closest(".field, .form-field, .form-line, .input-group");
      if (!node || node === form || !form.contains(node)) node = control.parentElement;
      // 다른 입력이 같은 상위 요소에 포함돼 있으면 해당 입력만 이동합니다.
      var many = node.querySelectorAll("input:not([type='hidden']), select, textarea");
      if (many.length > 1) {
        node = control.closest("label") || control.parentElement;
      }
      return node;
    }
    var kindField = wholeField(kindInput);
    var titleField = wholeField(titleInput);
    var bodyField = wholeField(bodyInput);
    var nicknameField = wholeField(nicknameInput);
    var anonymousField = wholeField(anonymousInput);
    var roleField = wholeField(roleSelect);
    var linkField = wholeField(linkInput);
    if (!kindField || !bodyField || !nicknameField || !roleField) return;

    var write = el("div", "hfw-writing");
    write.id = "habom-writing-flow";
    function step(number, name, help) {
      var section = el("section", "hfw-step");
      var head = el("div", "hfw-step-head");
      head.append(el("span", "hfw-number", String(number)), el("h2", "hfw-step-title", name));
      section.append(head);
      if (help) section.append(el("p", "hfw-note", help));
      return section;
    }
    function appendField(destination, field, classname) {
      if (!field || !destination) return;
      if (classname) field.classList.add(classname);
      destination.append(field);
    }

    var topic = step(1, "어떤 이야기인가요?");
    appendField(topic, kindField, "hfw-kind");
    appendField(topic, titleField, "hfw-title");

    var message = step(2, "내용을 적어주세요");
    appendField(message, bodyField, "hfw-body");
    if (linkField) {
      var extras = el("details", "hfw-extras");
      var summary = el("summary", "", "관련 링크 추가");
      var optional = el("span", "hfw-optional", "선택사항");
      summary.append(optional);
      extras.append(summary);
      appendField(extras, linkField, "hfw-link");
      extras.open = !!(linkInput && linkInput.value.trim());
      message.append(extras);
    }

    var sender = step(3, "마지막으로 작성자 정보");
    var senderRow = el("div", "hfw-author");
    appendField(senderRow, nicknameField, "hfw-nickname");
    if (anonymousField && anonymousField !== nicknameField) {
      appendField(senderRow, anonymousField, "hfw-anonymous");
    }
    sender.append(senderRow);
    appendField(sender, roleField, "hfw-role");

    write.append(topic, message, sender);
    form.insertBefore(write, form.firstChild);

    // 기존 글 남기기 버튼은 동일한 form 안에 유지하며 마지막에 배치합니다.
    var submit = Array.from(form.querySelectorAll("button")).find(function(button) {
      return !button.closest("#habom-role-picker") &&
        (button.type === "submit" || /글\s*남기기|등록하기|작성하기/.test(button.textContent));
    });
    var submitOuter = submit && (submit.closest(".submit-row, .form-actions, .actions, .button-row") || submit);
    if (submitOuter && !write.contains(submitOuter) && form.contains(submitOuter)) {
      var actions = el("div", "hfw-actions");
      actions.append(submitOuter);
      write.append(actions);
    }
    form.classList.add("habom-flow-form");
    form.dataset.habomWriteFlow = "yes";

    // 링크/필드가 접히고 펼쳐져도 iframe의 높이 자동 조절이 반영되도록 합니다.
    function requestHeight() {
      window.dispatchEvent(new Event("resize"));
    }
    write.querySelectorAll("details").forEach(function(node) {
      node.addEventListener("toggle", requestHeight);
    });
  }

  function addWritingStyle() {
    if (document.getElementById("habom-writing-style")) return;
    var style = el("style");
    style.id = "habom-writing-style";
    style.textContent = [
      "form.habom-flow-form{display:block!important;max-width:760px!important;width:100%!important;margin:0 auto!important;padding:0!important;grid-template-columns:none!important;gap:0!important;}",
      "#habom-writing-flow{display:block;width:100%;max-width:100%;color:#293c34;font:inherit}",
      "#habom-writing-flow *{box-sizing:border-box}",
      "#habom-writing-flow .hfw-step{display:block!important;position:relative;min-width:0;max-width:100%;padding:20px 0 25px;margin:0;border-bottom:1px solid #e6ede7;}",
      "#habom-writing-flow .hfw-step:first-child{padding-top:4px}",
      "#habom-writing-flow .hfw-step:nth-child(3){border-bottom:0;padding-bottom:10px}",
      "#habom-writing-flow .hfw-step-head{display:flex;gap:9px;align-items:center;margin:0 0 16px}",
      "#habom-writing-flow .hfw-number{display:inline-flex;align-items:center;justify-content:center;flex:none;width:25px;height:25px;border-radius:50%;background:#eaf4ed;color:#3c7956;font-size:12px;font-weight:800}",
      "#habom-writing-flow .hfw-step-title{margin:0;color:#2a4136;font:inherit;font-size:17px;font-weight:800;line-height:1.35}",
      "#habom-writing-flow .hfw-note{margin:0 0 12px;color:#7f8e83;font-size:12px;line-height:1.5}",
      "#habom-writing-flow .field,#habom-writing-flow .form-field,#habom-writing-flow .form-line{display:block!important;position:relative!important;grid-area:auto!important;grid-column:auto!important;grid-row:auto!important;min-width:0!important;max-width:none!important;width:100%!important;min-height:0!important;height:auto!important;margin:0 0 15px!important;padding:0!important;align-self:auto!important;justify-self:stretch!important}",
      "#habom-writing-flow .hfw-role{margin-bottom:0!important}",
      "#habom-writing-flow label:not(.hfw-anonymous label){display:block;margin:0 0 7px;color:#3b5144;font-size:13px;font-weight:700;line-height:1.4}",
      "#habom-writing-flow input:not([type='checkbox']):not([type='hidden']),#habom-writing-flow select,#habom-writing-flow textarea{display:block;width:100%!important;min-width:0!important;max-width:100%!important;padding:11px 13px!important;margin:0!important;box-sizing:border-box;border:1px solid #d6e2da!important;border-radius:10px!important;background:#fff!important;color:#34453b!important;font:inherit!important;font-size:14px!important;line-height:1.5!important;box-shadow:none!important;outline:none}",
      "#habom-writing-flow input:not([type='checkbox']):focus,#habom-writing-flow select:focus,#habom-writing-flow textarea:focus{border-color:#68a281!important;box-shadow:0 0 0 3px rgba(83,150,110,.12)!important}",
      "#habom-writing-flow input::placeholder,#habom-writing-flow textarea::placeholder{color:#9ba8a0!important;opacity:1}",
      "#habom-writing-flow .hfw-kind select{display:block!important;width:100%!important;height:46px!important;min-height:46px!important;max-height:46px!important}",
      "#habom-writing-flow .hfw-body textarea{min-height:145px!important;resize:vertical!important}",
      "#habom-writing-flow .hfw-extras{margin:1px 0 0;padding:0;border:0;background:none}",
      "#habom-writing-flow .hfw-extras summary{list-style:none;display:flex;align-items:center;gap:10px;width:max-content;max-width:100%;min-height:39px;padding:0 1px;color:#488266;font-size:13px;font-weight:700;cursor:pointer}",
      "#habom-writing-flow .hfw-extras summary::-webkit-details-marker{display:none}",
      "#habom-writing-flow .hfw-extras summary:before{content:'+';display:inline-flex;width:18px;height:18px;border:1px solid #91b69e;border-radius:50%;align-items:center;justify-content:center;font-size:14px;font-weight:500}",
      "#habom-writing-flow .hfw-extras[open] summary:before{content:'−'}",
      "#habom-writing-flow .hfw-optional{font-size:11px;color:#8c9b91;font-weight:500}",
      "#habom-writing-flow .hfw-link{margin:9px 0 2px!important}",
      "#habom-writing-flow .hfw-author{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end}",
      "#habom-writing-flow .hfw-nickname{min-width:0!important;margin:0 0 16px!important}",
      "#habom-writing-flow .hfw-anonymous{width:auto!important;margin:0 0 16px!important;align-self:end!important;min-height:46px!important;display:flex!important;align-items:center!important}",
      "#habom-writing-flow .hfw-anonymous label{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;gap:8px!important;white-space:nowrap!important;font-size:13px!important;color:#344e3d!important;margin:0!important}",
      "#habom-writing-flow .hfw-anonymous input[type='checkbox']{display:inline-block!important;flex:0 0 17px!important;width:17px!important;height:17px!important;min-width:17px!important;max-width:17px!important;min-height:17px!important;margin:0!important;accent-color:#488569}",
      "#habom-writing-flow .hfw-role #habom-role-picker{margin:0;width:100%}",
      "#habom-writing-flow .hfw-role #habom-role-picker .hrp-trigger{font-weight:550;font-size:13px;min-height:44px}",
      "#habom-writing-flow .hfw-actions{display:flex;justify-content:flex-start;align-items:center;gap:10px;padding:7px 0 3px}",
      "#habom-writing-flow .hfw-actions button{min-height:45px;padding:10px 24px;border-radius:12px;font-size:14px;font-weight:800}",
      "form.habom-flow-form > .hfw-writing + .field{margin-top:5px}",
      "@media(max-width:600px){form.habom-flow-form{width:100%!important;padding:0!important}#habom-writing-flow .hfw-step{padding:17px 0 21px}#habom-writing-flow .hfw-step-title{font-size:16px}#habom-writing-flow .hfw-author{grid-template-columns:minmax(0,1fr);gap:0}#habom-writing-flow .hfw-nickname{margin-bottom:9px!important}#habom-writing-flow .hfw-anonymous{min-height:30px!important;margin-bottom:15px!important}#habom-writing-flow .hfw-actions button{width:100%;max-width:100%}#habom-writing-flow .hfw-actions{display:block}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() { init(); addWritingStyle(); enhanceWritingFlow(); }, { once: true });
  } else {
    init();
    addWritingStyle();
    enhanceWritingFlow();
  }
})();