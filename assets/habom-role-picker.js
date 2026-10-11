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
      "form .field:has(input[name='anonymous']) label,form label:has(input[name='anonymous']){white-space:nowrap!important;word-break:keep-all!important;width:auto!important;max-width:none!important;justify-content:flex-start!important}",
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
      var height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();