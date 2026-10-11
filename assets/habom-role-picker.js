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
      "#habom-role-picker{margin:10px 0 14px;width:100%;font:inherit;color:inherit}",
      "#habom-role-picker *{box-sizing:border-box}",
      "#habom-role-picker .hrp-helper{margin:0 0 11px;color:#66756c;font-size:13px;line-height:1.5}",
      "#habom-role-picker .hrp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
      "#habom-role-picker .hrp-chip{display:block;width:100%;min-width:0;min-height:49px;padding:10px 8px;border:1px solid #cfded5;border-radius:12px;background:#fbfdfb;color:#30453b;font:inherit;font-size:13px;font-weight:650;line-height:1.35;text-align:center;overflow-wrap:anywhere;cursor:pointer;touch-action:manipulation;transition:background .12s,border-color .12s}",
      "#habom-role-picker .hrp-chip:hover{background:#f0f7f1;border-color:#7fa78d}",
      "#habom-role-picker .hrp-chip:focus-visible{outline:3px solid #719f8b;outline-offset:2px}",
      "#habom-role-picker .hrp-chip[aria-pressed=true]{background:#e5f3e9;border:2px solid #548c72;color:#20593d;padding:9px 7px}",
      "#habom-role-picker .hrp-detail{margin-top:14px;padding-top:11px;border-top:1px dashed #d7e3db}",
      "#habom-role-picker .hrp-detail-title{display:block;margin-bottom:10px;font-size:14px;font-weight:750;color:#365f49}",
      "#habom-role-picker .hrp-other{display:block;width:100%;min-height:44px;margin:10px 0 0;padding:10px 12px;border:1px solid #b7cabc;border-radius:10px;background:#fff;color:#23362c;font:inherit;font-size:14px}",
      "#habom-role-picker .hrp-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;font-size:12px;color:#5e7566}",
      "#habom-role-picker .hrp-reset{border:0;background:none;color:#477e62;text-decoration:underline;text-underline-offset:3px;font:inherit;font-size:12px;padding:5px;cursor:pointer}",
      "@media (max-width:370px){#habom-role-picker .hrp-grid{gap:6px}#habom-role-picker .hrp-chip{font-size:12px;padding:9px 5px}}",
      "@media (prefers-reduced-motion:reduce){#habom-role-picker .hrp-chip{transition:none}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function init() {
    var select = document.querySelector('select[name="audience"]');
    if (!select || select.dataset.habomRoleEnhanced === "yes") return;

    var parent = select.parentElement;
    var root = el("section");
    root.id = "habom-role-picker";
    root.setAttribute("aria-label", "방문자 역할 선택");
    var helper = el("p", "hrp-helper", "가장 가까운 역할을 골라 주세요. 선택하지 않아도 글을 남길 수 있어요.");
    var groupsEl = el("div", "hrp-grid");
    var detail = el("div", "hrp-detail");
    detail.hidden = true;
    var detailTitle = el("strong", "hrp-detail-title");
    var choicesEl = el("div", "hrp-grid");
    var otherEl = el("input", "hrp-other");
    otherEl.type = "text";
    otherEl.maxLength = 20;
    otherEl.placeholder = "역할이나 직업을 적어 주세요 (20자 이내)";
    otherEl.setAttribute("aria-label", "직접 입력할 역할");
    otherEl.hidden = true;
    var footer = el("div", "hrp-footer");
    var status = el("span", "hrp-status", "선택하지 않음");
    status.setAttribute("aria-live", "polite");
    var reset = el("button", "hrp-reset", "선택 해제");
    reset.type = "button";
    footer.append(status, reset);
    detail.append(detailTitle, choicesEl, otherEl);
    root.append(helper, groupsEl, detail, footer);

    var selectedGroup = "";
    var selectedRole = "";
    var groupButtons = [];
    var roleButtons = [];

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
      status.textContent = normalized === "선택 안 함" ? "선택하지 않음" : "선택: " + normalized;
    }

    function redrawPressed() {
      groupButtons.forEach(function(button) {
        button.setAttribute("aria-pressed", String(button.dataset.group === selectedGroup));
      });
      roleButtons.forEach(function(button) {
        button.setAttribute("aria-pressed", String(button.dataset.role === selectedRole));
      });
    }

    function isOther(item) {
      return item.indexOf("기타") === 0;
    }

    function pickRole(item) {
      selectedRole = item;
      otherEl.hidden = !isOther(item);
      if (isOther(item)) {
        otherEl.value = "";
        setAudience(selectedGroup);
        otherEl.focus();
      } else {
        setAudience(item);
      }
      redrawPressed();
    }

    function pickGroup(group) {
      selectedGroup = group.name;
      selectedRole = "";
      otherEl.hidden = true;
      otherEl.value = "";
      setAudience(group.name);
      choicesEl.textContent = "";
      roleButtons = [];

      if (group.items && group.items.length) {
        detail.hidden = false;
        detailTitle.textContent = group.name + " · 세부 역할";
        group.items.forEach(function(item) {
          var button = el("button", "hrp-chip", item);
          button.type = "button";
          button.dataset.role = item;
          button.setAttribute("aria-pressed", "false");
          button.addEventListener("click", function() { pickRole(item); });
          choicesEl.appendChild(button);
          roleButtons.push(button);
        });
      } else {
        detail.hidden = true;
      }
      redrawPressed();
    }

    GROUPS.forEach(function(group) {
      var button = el("button", "hrp-chip", group.name);
      button.type = "button";
      button.dataset.group = group.name;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function() { pickGroup(group); });
      groupsEl.appendChild(button);
      groupButtons.push(button);
    });

    otherEl.addEventListener("input", function() {
      setAudience(otherEl.value || selectedGroup);
    });
    reset.addEventListener("click", function() {
      selectedGroup = "";
      selectedRole = "";
      detail.hidden = true;
      otherEl.hidden = true;
      otherEl.value = "";
      setAudience("선택 안 함");
      redrawPressed();
    });

    addStyle();
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();